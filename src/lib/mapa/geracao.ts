import type { MapaOrigem, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { MAPA_SCHEMA_VERSION, validarConteudoMapa } from './conteudo'
import { EXEMPLO_CONTEUDO } from './exemplo'

/**
 * Geracao do Mapa: o app pede, o n8n gera, o n8n devolve.
 *
 * Por push e nao por fila com cron (como a descoberta): a pessoa esta olhando a
 * animacao e o protótipo promete "menos de 1 minuto". O app chama o webhook do
 * n8n, que responde na hora e trabalha em segundo plano; quando termina, chama
 * `POST /api/mapa/resultado`. A pagina acompanha pelo status.
 *
 * Quem some no meio (n8n caiu, callback perdido) vira `erro` quando passa do
 * tempo maximo, e a pagina oferece tentar de novo.
 */

export const TEMPO_MAXIMO_GERACAO_MS = 3 * 60 * 1000
export const MAX_TENTATIVAS_GERACAO = 3

const LOG = '[mapa/geracao]'

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mediz.app'
  )
}

/** O que vai para o n8n: so o que o prompt precisa, sem dado de pagamento. */
function montarPedido(mapa: MapaOrigem) {
  return {
    mapa_id: mapa.id,
    schema_version: MAPA_SCHEMA_VERSION,
    callback_url: new URL('/api/mapa/resultado', baseUrl()).toString(),
    entrada: {
      nome: mapa.nome,
      sintoma: mapa.sintoma,
      tempo: mapa.tempo,
      momentos: mapa.momentos ?? [],
      familia: mapa.familia,
      para_outra_pessoa: mapa.paraOutraPessoa,
      relacao: mapa.relacao
    }
  }
}

async function marcarErro(id: string, motivo: string): Promise<void> {
  await prisma.mapaOrigem.update({
    where: { id },
    data: { status: 'erro', erroGeracao: motivo.slice(0, 500) }
  })
}

/**
 * Gerador de mentira para desenvolvimento: devolve o Mapa do Rafael com o
 * titulo do sintoma pedido. Liga com MAPA_GERADOR=exemplo. Nunca em producao —
 * venderia o Mapa de outra pessoa.
 */
function geradorDeExemplo(): boolean {
  return (
    process.env.MAPA_GERADOR?.trim() === 'exemplo' &&
    process.env.NODE_ENV !== 'production'
  )
}

/**
 * Comeca (ou recomeca) a geracao. Nunca lanca: falha vira `status = erro`,
 * que a pagina mostra com o botao de tentar de novo.
 */
export async function dispararGeracao(mapa: MapaOrigem): Promise<void> {
  await prisma.mapaOrigem.update({
    where: { id: mapa.id },
    data: {
      status: 'gerando',
      erroGeracao: null,
      geracaoIniciadaEm: new Date(),
      tentativasGeracao: { increment: 1 }
    }
  })

  if (geradorDeExemplo()) {
    const conteudo = {
      ...EXEMPLO_CONTEUDO,
      capa: { sintoma_titulo: mapa.sintoma.slice(0, 60), desde: mapa.tempo?.slice(0, 60) ?? null }
    }
    setTimeout(() => {
      void registrarResultado({ mapaId: mapa.id, conteudo }).catch(() => undefined)
    }, 8000)
    return
  }

  const url = process.env.N8N_MAPA_GERAR_WEBHOOK_URL?.trim()
  if (!url) {
    logger.warn('N8N_MAPA_GERAR_WEBHOOK_URL não configurada', LOG)
    await marcarErro(mapa.id, 'Gerador não configurado')
    return
  }

  try {
    const token = process.env.MAPA_WEBHOOK_TOKEN?.trim()
    const resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(montarPedido(mapa)),
      signal: AbortSignal.timeout(10_000)
    })
    if (!resposta.ok) {
      await marcarErro(mapa.id, `n8n respondeu HTTP ${resposta.status}`)
    }
  } catch (error) {
    logger.error(
      'Falha ao chamar o gerador do Mapa',
      error instanceof Error ? error : undefined,
      LOG
    )
    await marcarErro(
      mapa.id,
      error instanceof Error ? error.message : 'Falha de rede'
    )
  }
}

/**
 * Mapa parado em `gerando` alem do tempo maximo vira `erro`. Chamado na
 * leitura do status — a pagina que pergunta e quem descobre que travou.
 */
export async function resolverGeracaoTravada(
  mapa: MapaOrigem
): Promise<MapaOrigem> {
  if (mapa.status !== 'gerando' || !mapa.geracaoIniciadaEm) return mapa
  if (Date.now() - mapa.geracaoIniciadaEm.getTime() < TEMPO_MAXIMO_GERACAO_MS) {
    return mapa
  }

  // Condicional no status: se o callback chegar no mesmo instante, ele vence.
  const { count } = await prisma.mapaOrigem.updateMany({
    where: { id: mapa.id, status: 'gerando' },
    data: { status: 'erro', erroGeracao: 'Tempo de geração esgotado' }
  })
  if (count === 0) {
    return (await prisma.mapaOrigem.findUnique({ where: { id: mapa.id } })) ?? mapa
  }
  return { ...mapa, status: 'erro', erroGeracao: 'Tempo de geração esgotado' }
}

export type ResultadoGeracao =
  | { ok: true }
  | { ok: false; status: number; erro: string }

/**
 * Grava o que o n8n devolveu. Conteudo invalido nao entra: vira `erro` com o
 * motivo, para o admin ver o que o modelo errou e a pagina oferecer de novo.
 */
export async function registrarResultado(input: {
  mapaId: string
  conteudo?: unknown
  erro?: string | null
}): Promise<ResultadoGeracao> {
  const mapa = await prisma.mapaOrigem.findUnique({
    where: { id: input.mapaId },
    select: { id: true, status: true, paidAt: true }
  })
  if (!mapa) return { ok: false, status: 404, erro: 'Mapa não encontrado' }

  // Mapa pago nao se regera por cima: o que a pessoa comprou fica como esta.
  if (mapa.paidAt) return { ok: false, status: 409, erro: 'Mapa já pago' }

  if (input.erro) {
    await marcarErro(mapa.id, `Gerador: ${input.erro}`)
    return { ok: true }
  }

  const validacao = validarConteudoMapa(input.conteudo)
  if (validacao.ok === false) {
    logger.warn(`Conteúdo inválido do gerador (${mapa.id}): ${validacao.erro}`, LOG)
    await marcarErro(mapa.id, `Conteúdo inválido: ${validacao.erro}`)
    return { ok: false, status: 422, erro: validacao.erro }
  }

  await prisma.mapaOrigem.update({
    where: { id: mapa.id },
    data: {
      status: 'pronto',
      conteudo: validacao.conteudo as unknown as Prisma.InputJsonValue,
      schemaVersion: validacao.conteudo.versao,
      fraseForte: validacao.conteudo.frase_forte.replace(/\*\*/g, '').slice(0, 300),
      geracaoConcluidaEm: new Date(),
      erroGeracao: null
    }
  })
  return { ok: true }
}

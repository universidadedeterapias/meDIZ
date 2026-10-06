import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  ConfigFluxo,
  EnvioExistente,
  Finalizacao,
  PedidoNormalizado,
  RepositorioPortao,
  Reserva,
  StatusEnvio
} from './portao'

/**
 * O portao (src/lib/mensagens/portao.ts) sobre o Postgres. A garantia contra
 * reenvio mora no `reservar`: o UNIQUE de `chave` decide quem fica com a
 * reserva, e nao uma leitura seguida de escrita, que duas execucoes
 * simultaneas do n8n atravessariam juntas.
 */

/** Status que ocupam o teto: o que saiu, o que esta saindo e o que pode ter saido. */
const OCUPAM_TETO = ['reservado', 'enviado', 'incerto']

export const repositorioPrisma: RepositorioPortao = {
  async reservar(pedido: PedidoNormalizado, agora: Date): Promise<Reserva> {
    const corpo = JSON.stringify(pedido.corpo)
    const n8nWorkflowId = pedido.n8nWorkflowId ?? null
    const n8nExecucaoId = pedido.n8nExecucaoId ?? null

    const criada = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO mensagens_enviadas
        (id, chave, fluxo, user_id, telefone, template, idioma, status, corpo,
         n8n_workflow_id, n8n_execucao_id, tentativa_em, criado_em, atualizado_em)
      VALUES
        (gen_random_uuid()::text, ${pedido.chave}, ${pedido.fluxo}, ${pedido.userId ?? null},
         ${pedido.telefone}, ${pedido.corpo.templateName}, ${pedido.corpo.templateLangCode ?? null},
         'reservado', ${corpo}::jsonb, ${n8nWorkflowId}, ${n8nExecucaoId}, ${agora}, ${agora}, ${agora})
      ON CONFLICT (chave) DO NOTHING
      RETURNING id
    `)
    if (criada.length) return { tipo: 'nova', id: criada[0].id }

    // A chave existe. So `falhou` e `barrado` voltam para a fila: o Chatvolt
    // recusou ou caiu (nada saiu), ou uma regra segurou (nada saiu). O UPDATE
    // condicional e atomico — de duas retentativas simultaneas, so uma pega.
    const retentativa = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      UPDATE mensagens_enviadas
         SET status = 'reservado', motivo = NULL, tentativas = tentativas + 1,
             corpo = ${corpo}::jsonb, telefone = ${pedido.telefone},
             template = ${pedido.corpo.templateName},
             n8n_workflow_id = ${n8nWorkflowId}, n8n_execucao_id = ${n8nExecucaoId},
             tentativa_em = ${agora}, atualizado_em = ${agora}
       WHERE chave = ${pedido.chave}
         AND status IN ('falhou', 'barrado')
      RETURNING id
    `)
    if (retentativa.length) return { tipo: 'retentativa', id: retentativa[0].id }

    const existente = await prisma.mensagemEnviada.findUnique({
      where: { chave: pedido.chave },
      select: { id: true, status: true, motivo: true, conversationId: true }
    })
    if (!existente) {
      // So acontece se a linha sumiu entre as duas consultas — ninguem apaga
      // linhas desta tabela, entao trata como erro de verdade.
      throw new Error(`mensagens_enviadas: chave ${pedido.chave} em conflito mas nao encontrada`)
    }
    return { tipo: 'existente', envio: existente as EnvioExistente & { status: StatusEnvio } }
  },

  async buscarFluxo(fluxo: string): Promise<ConfigFluxo | null> {
    return prisma.fluxoAutomacao.findUnique({
      where: { fluxo },
      select: { fluxo: true, ligado: true, tetoDiario: true, contaNoLimitePessoa: true, limitePessoa24h: true }
    })
  },

  async contarDoFluxo(fluxo: string, desde: Date, excetoId: string): Promise<number> {
    return prisma.mensagemEnviada.count({
      where: { fluxo, status: { in: OCUPAM_TETO }, tentativaEm: { gte: desde }, id: { not: excetoId } }
    })
  },

  async contarDaPessoa(telefone: string, desde: Date, excetoId: string): Promise<number> {
    const [linha] = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
      SELECT count(*) AS n
        FROM mensagens_enviadas m
        JOIN fluxos_automacao f ON f.fluxo = m.fluxo
       WHERE m.telefone = ${telefone}
         AND m.status IN (${Prisma.join(OCUPAM_TETO)})
         AND m.tentativa_em >= ${desde}
         AND m.id <> ${excetoId}
         AND f.conta_no_limite_pessoa
    `)
    return Number(linha?.n ?? 0)
  },

  async finalizar(id: string, dados: Finalizacao): Promise<void> {
    await prisma.mensagemEnviada.update({
      where: { id },
      data: {
        status: dados.status,
        motivo: dados.motivo ?? null,
        httpStatus: dados.httpStatus ?? null,
        resposta: dados.resposta === undefined || dados.resposta === null
          ? Prisma.DbNull
          : (cortarResposta(dados.resposta) as Prisma.InputJsonValue),
        conversationId: dados.conversationId ?? null,
        categoria: dados.categoria ?? null,
        enviadoEm: dados.enviadoEm ?? null
      }
    })
  }
}

/** A resposta do Chatvolt e pequena, mas uma pagina de erro HTML nao e. */
function cortarResposta(resposta: unknown): unknown {
  const texto = typeof resposta === 'string' ? resposta : JSON.stringify(resposta)
  if (texto.length <= 4000) return typeof resposta === 'string' ? { texto } : resposta
  return { cortado: true, inicio: texto.slice(0, 4000) }
}

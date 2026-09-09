import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { criarCampanha, metricasDaCampanha } from '@/lib/reativacao/campanhas'
import {
  ESTADOS,
  FONTES_VARIAVEL,
  MODOS_AMOSTRAGEM,
  ORIGENS,
  filtrosPadrao,
  amostragemPadrao,
  MAPEAMENTO_PADRAO,
  BOTAO_PADRAO,
  type Amostragem,
  type Estado,
  type Filtros,
  type FonteVariavel,
  type MapeamentoBotao,
  type MapeamentoVariavel,
  type ModoAmostragem,
  type Origem,
  type SelecaoPublico
} from '@/lib/reativacao/tipos'

export const dynamic = 'force-dynamic'

/**
 * Ondas de reativacao: criar e listar.
 *
 * Criar materializa a lista e para. Nada sai daqui — a onda nasce em `rascunho`
 * e alguem precisa olhar o numero antes de ativar.
 */

function lista<T extends string>(v: unknown, validos: readonly T[]): T[] {
  if (!Array.isArray(v)) return []
  const permitidos = new Set<string>(validos)
  return [...new Set(v.filter((x): x is T => typeof x === 'string' && permitidos.has(x)))]
}

function inteiro(v: unknown, padrao: number, min: number, max: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : padrao
}

/**
 * O mapeamento das variaveis, validado.
 *
 * Posicao fora de ordem ou fonte inventada nao viram erro: viram descarte. O
 * template ja e a parte fragil (nome errado volta 500 da Meta) e nao precisa de
 * um segundo jeito de quebrar.
 */
function mapeamento(v: unknown): MapeamentoVariavel[] {
  if (!Array.isArray(v)) return MAPEAMENTO_PADRAO
  const fontes = new Set<string>(FONTES_VARIAVEL)
  const limpo = v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((x) => ({
      posicao: Number(x.posicao),
      fonte: String(x.fonte) as FonteVariavel,
      valor: typeof x.valor === 'string' ? x.valor.slice(0, 400) : undefined
    }))
    .filter(
      (x) => Number.isInteger(x.posicao) && x.posicao >= 1 && x.posicao <= 10 && fontes.has(x.fonte)
    )
    .sort((a, b) => a.posicao - b.posicao)
  return limpo
}

function botaoDe(v: unknown): MapeamentoBotao {
  if (v === null) return null
  const b = v as Record<string, unknown> | undefined
  if (b?.tipo === 'url' && b?.fonte === 'token') return { tipo: 'url', fonte: 'token' }
  return BOTAO_PADRAO
}

/**
 * `todos` nao carrega valor. `quantidade` precisa de um inteiro >= 1;
 * `percentual`, de um inteiro 1-100. Valor invalido ou fora da forma do modo
 * cai no padrao (`todos`) — e nao um erro 400 — porque a onda ainda pode ser
 * criada do jeito de sempre, so sem o corte.
 */
function amostragemDe(v: unknown): Amostragem {
  const a = v as Record<string, unknown> | undefined
  const modo = a?.modo as ModoAmostragem | undefined
  if (!modo || !MODOS_AMOSTRAGEM.includes(modo) || modo === 'todos') return amostragemPadrao()

  const valor = Number(a?.valor)
  if (!Number.isFinite(valor)) return amostragemPadrao()

  if (modo === 'quantidade') {
    return { modo, valor: Math.max(1, Math.trunc(valor)) }
  }
  // percentual
  return { modo, valor: Math.min(100, Math.max(1, Math.trunc(valor))) }
}

/** Tag e vocabulario aberto — sem enum fechado para validar contra, so limpa
 *  e deduplica. */
function listaLivre(v: unknown, max = 50): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x): x is string => typeof x === 'string'))].slice(0, max)
}

function dataOuNull(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null
  return Number.isNaN(Date.parse(v)) ? null : v
}

function filtrosDe(f: Record<string, unknown> | undefined): Filtros {
  return {
    ...filtrosPadrao(),
    corte: inteiro(f?.corte, 30, 1, 3650),
    estados: lista<Estado>(f?.estados, ESTADOS),
    incluirOrigens: lista<Origem>(f?.incluirOrigens, ORIGENS),
    excluirOrigens: lista<Origem>(f?.excluirOrigens, ORIGENS),
    incluirTags: listaLivre(f?.incluirTags),
    excluirTags: listaLivre(f?.excluirTags),
    idiomas: lista(f?.idiomas, ['pt-BR', 'pt', 'es', 'en'] as const),
    semIdioma: f?.semIdioma === true,
    atividadeDesde: dataOuNull(f?.atividadeDesde),
    atividadeAte: dataOuNull(f?.atividadeAte),
    compraDesde: dataOuNull(f?.compraDesde),
    compraAte: dataOuNull(f?.compraAte),
    busca: typeof f?.busca === 'string' && f.busca.trim() ? f.busca.trim() : null
  }
}

/**
 * Como a lista final de destinatarios foi apontada — filtro (com exclusoes
 * pontuais) ou lista manual de IDs marcados na tela por checkbox.
 *
 * Corpo malformado ou ausente cai em `filtro` com o recorte vazio de
 * `filtrosPadrao()`, que `criarCampanha` recusa por nao ter ninguem — em vez
 * de um 400 aqui, o erro sai mais claro la ("Nenhuma pessoa selecionada").
 */
function selecaoDe(v: unknown): SelecaoPublico {
  const s = v as Record<string, unknown> | undefined

  if (s?.modo === 'lista') {
    return {
      modo: 'lista',
      userIds: listaLivre(s.userIds, 50_000),
      corte: inteiro(s.corte, 30, 1, 3650)
    }
  }

  return {
    modo: 'filtro',
    filtros: filtrosDe(s?.filtros as Record<string, unknown> | undefined),
    excluidos: listaLivre(s?.excluidos, 50_000)
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const campanhas = await prisma.reactivationCampaign.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 50
  })

  const comMetricas = await Promise.all(
    campanhas.map(async (c) => ({
      id: c.id,
      nome: c.nome,
      status: c.status,
      templateName: c.templateName,
      templateLang: c.templateLang,
      corteDias: c.corteDias,
      selecaoModo: c.selecaoModo,
      amostragemModo: c.amostragemModo,
      amostragemValor: c.amostragemValor,
      tetoDiario: c.tetoDiario,
      horaInicio: c.horaInicio,
      horaFim: c.horaFim,
      totalRecorte: c.totalRecorte,
      totalDestinatarios: c.totalDestinatarios,
      criadoPor: c.criadoPor,
      criadoEm: c.criadoEm.toISOString(),
      iniciadaEm: c.iniciadaEm?.toISOString() ?? null,
      metricas: await metricasDaCampanha(c.id)
    }))
  )

  return NextResponse.json({ campanhas: comMetricas })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const corpo = await request.json().catch(() => null)
  if (!corpo || typeof corpo !== 'object') {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const b = corpo as Record<string, unknown>
  const nome = String(b.nome ?? '').trim()
  const templateName = String(b.templateName ?? '').trim()

  if (!nome) {
    return NextResponse.json({ error: 'Dê um nome à onda.' }, { status: 400 })
  }
  if (!templateName) {
    return NextResponse.json(
      { error: 'Escolha o template aprovado na Meta.' },
      { status: 400 }
    )
  }

  if (!b.selecao) {
    return NextResponse.json({ error: 'Selecione ao menos uma pessoa.' }, { status: 400 })
  }

  try {
    const resultado = await criarCampanha({
      nome: nome.slice(0, 160),
      templateName: templateName.slice(0, 120),
      templateLang: String(b.templateLang ?? 'pt_BR').slice(0, 10),
      crmScenarioId: b.crmScenarioId ? String(b.crmScenarioId).slice(0, 120) : null,
      crmStepId: b.crmStepId ? String(b.crmStepId).slice(0, 120) : null,
      variaveis: mapeamento(b.variaveis),
      botao: botaoDe(b.botao),
      amostragem: amostragemDe(b.amostragem),
      tetoDiario: inteiro(b.tetoDiario, 700, 1, 5000),
      horaInicio: inteiro(b.horaInicio, 8, 0, 23),
      horaFim: inteiro(b.horaFim, 20, 0, 23),
      selecao: selecaoDe(b.selecao),
      criadoPor: auth.user.email
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao criar a onda.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

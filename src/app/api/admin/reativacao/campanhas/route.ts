import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { criarCampanha, metricasDaCampanha } from '@/lib/reativacao/campanhas'
import {
  ESTADOS,
  ORIGENS,
  filtrosPadrao,
  type Estado,
  type Origem
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
      tetoDiario: c.tetoDiario,
      horaInicio: c.horaInicio,
      horaFim: c.horaFim,
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

  const f = b.filtros as Record<string, unknown> | undefined
  const filtros = {
    ...filtrosPadrao(),
    corte: inteiro(f?.corte, 30, 1, 3650),
    estados: lista<Estado>(f?.estados, ESTADOS),
    incluirOrigens: lista<Origem>(f?.incluirOrigens, ORIGENS),
    excluirOrigens: lista<Origem>(f?.excluirOrigens, ORIGENS),
    idiomas: lista(f?.idiomas, ['pt-BR', 'pt', 'es', 'en'] as const),
    semIdioma: f?.semIdioma === true,
    busca: typeof f?.busca === 'string' && f.busca.trim() ? f.busca.trim() : null
  }

  try {
    const resultado = await criarCampanha({
      nome: nome.slice(0, 160),
      templateName: templateName.slice(0, 120),
      templateLang: String(b.templateLang ?? 'pt_BR').slice(0, 10),
      crmScenarioId: b.crmScenarioId ? String(b.crmScenarioId).slice(0, 120) : null,
      crmStepId: b.crmStepId ? String(b.crmStepId).slice(0, 120) : null,
      tetoDiario: inteiro(b.tetoDiario, 700, 1, 5000),
      horaInicio: inteiro(b.horaInicio, 8, 0, 23),
      horaFim: inteiro(b.horaFim, 20, 0, 23),
      filtros,
      criadoPor: auth.user.email
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao criar a onda.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

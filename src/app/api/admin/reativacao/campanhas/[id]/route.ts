import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  metricasDaCampanha,
  enviadosHoje,
  podeTransicionar,
  STATUS_CAMPANHA,
  type StatusCampanha
} from '@/lib/reativacao/campanhas'

export const dynamic = 'force-dynamic'

/**
 * Uma onda: o funil, uma amostra dos destinatarios, e o botao de parar.
 *
 * Parar existe e e o controle mais importante desta tela. O plano diz que se a
 * taxa de bloqueio subir, para tudo — e isso precisa ser um clique, nao um
 * chamado para quem programa.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await params
  const campanha = await prisma.reactivationCampaign.findUnique({ where: { id } })
  if (!campanha) {
    return NextResponse.json({ error: 'Onda não encontrada.' }, { status: 404 })
  }

  const statusFiltro = request.nextUrl.searchParams.get('status')

  const [metricas, hoje, destinatarios] = await Promise.all([
    metricasDaCampanha(id),
    enviadosHoje(id),
    prisma.reactivationRecipient.findMany({
      where: {
        campaignId: id,
        ...(statusFiltro ? { status: statusFiltro } : {})
      },
      orderBy: [{ enviadoEm: 'desc' }, { criadoEm: 'asc' }],
      take: 100,
      select: {
        id: true,
        email: true,
        nome: true,
        telefone: true,
        estado: true,
        origens: true,
        status: true,
        motivo: true,
        enviadoEm: true,
        clicouEm: true,
        acessouEm: true,
        tentativas: true,
        ultimoErro: true
      }
    })
  ])

  return NextResponse.json({
    campanha: {
      id: campanha.id,
      nome: campanha.nome,
      status: campanha.status,
      templateName: campanha.templateName,
      templateLang: campanha.templateLang,
      canal: campanha.canal,
      crmScenarioId: campanha.crmScenarioId,
      crmStepId: campanha.crmStepId,
      filtros: campanha.filtros,
      corteDias: campanha.corteDias,
      tetoDiario: campanha.tetoDiario,
      horaInicio: campanha.horaInicio,
      horaFim: campanha.horaFim,
      totalDestinatarios: campanha.totalDestinatarios,
      criadoPor: campanha.criadoPor,
      criadoEm: campanha.criadoEm.toISOString(),
      iniciadaEm: campanha.iniciadaEm?.toISOString() ?? null,
      concluidaEm: campanha.concluidaEm?.toISOString() ?? null
    },
    metricas,
    enviadosHoje: hoje,
    destinatarios: destinatarios.map((d) => ({
      ...d,
      enviadoEm: d.enviadoEm?.toISOString() ?? null,
      clicouEm: d.clicouEm?.toISOString() ?? null,
      acessouEm: d.acessouEm?.toISOString() ?? null
    }))
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await params
  const corpo = await request.json().catch(() => null)
  const novo = String((corpo as { status?: unknown })?.status ?? '')

  if (!STATUS_CAMPANHA.includes(novo as StatusCampanha)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  const campanha = await prisma.reactivationCampaign.findUnique({ where: { id } })
  if (!campanha) {
    return NextResponse.json({ error: 'Onda não encontrada.' }, { status: 404 })
  }

  if (!podeTransicionar(campanha.status, novo)) {
    return NextResponse.json(
      {
        error: `Não dá para ir de ${campanha.status} para ${novo}. Onda concluída ou cancelada não volta — ressuscitar a lista sem revisar é o caminho para disparar duas vezes para a mesma pessoa.`
      },
      { status: 409 }
    )
  }

  // Cancelar tira da fila o que ainda nao saiu. Quem ja recebeu, recebeu.
  const atualizada = await prisma.$transaction(async (tx) => {
    if (novo === 'cancelada') {
      await tx.reactivationRecipient.updateMany({
        where: { campaignId: id, status: { in: ['pendente', 'enviando'] } },
        data: { status: 'descartado', motivo: 'onda cancelada' }
      })
    }
    return tx.reactivationCampaign.update({
      where: { id },
      data: {
        status: novo,
        ...(novo === 'ativa' && !campanha.iniciadaEm
          ? { iniciadaEm: new Date() }
          : {}),
        ...(novo === 'concluida' ? { concluidaEm: new Date() } : {})
      }
    })
  })

  return NextResponse.json({ id: atualizada.id, status: atualizada.status })
}

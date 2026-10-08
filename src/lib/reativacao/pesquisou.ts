import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Avisa o n8n que alguem que recebeu uma onda de reativacao pesquisou no app.
 *
 * O n8n move a conversa para a etapa "pesquisou" do cenario da onda, onde o
 * prompt muda de "voce ainda nao entrou" para "como foi a sua pesquisa". Sem o
 * aviso, o Chatvolt so saberia consultando o app — e consulta periodica chega
 * atrasada justamente na hora em que a pessoa esta com o app aberto.
 *
 * O app so conta o fato. Qual etapa corresponde a cada cenario e decisao do
 * n8n: onda de cenario que nao tem etapa "pesquisou" e ignorada la.
 *
 * Vale a primeira pesquisa ate JANELA_DIAS depois do envio. `pesquisou_em` so e
 * gravado quando o n8n respondeu 2xx: aviso que falhou e tentado de novo na
 * proxima pesquisa. Dois avisos para a mesma pessoa (duas pesquisas no mesmo
 * segundo) movem a conversa para a mesma etapa duas vezes — inofensivo.
 */

export const JANELA_DIAS = 7

const URL_PADRAO = 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/reativacao/pesquisou'

export type DestinatarioDaOnda = {
  id: string
  conversationId: string
  campanhaId: string
  campanha: string
  crmScenarioId: string | null
  crmStepId: string | null
}

export type DependenciasAviso = {
  buscarUltimaOnda(userId: string, desde: Date): Promise<DestinatarioDaOnda | null>
  marcarPesquisou(destinatarioId: string, quando: Date): Promise<void>
  avisar(url: string, corpo: Record<string, unknown>): Promise<boolean>
  agora?: () => Date
  url?: string
}

export type ResultadoAviso = 'sem_onda' | 'avisado' | 'falhou'

export async function avisaPesquisaDaReativacao(
  userId: string,
  deps: DependenciasAviso = dependenciasReais()
): Promise<ResultadoAviso> {
  const agora = (deps.agora ?? (() => new Date()))()
  const desde = new Date(agora.getTime() - JANELA_DIAS * 24 * 60 * 60 * 1000)

  const dest = await deps.buscarUltimaOnda(userId, desde)
  if (!dest) return 'sem_onda'

  const ok = await deps.avisar(deps.url ?? URL_PADRAO, {
    evento: 'pesquisou',
    destinatarioId: dest.id,
    userId,
    conversationId: dest.conversationId,
    campanhaId: dest.campanhaId,
    campanha: dest.campanha,
    crmScenarioId: dest.crmScenarioId,
    crmStepId: dest.crmStepId,
    quando: agora.toISOString()
  })
  if (!ok) return 'falhou'

  await deps.marcarPesquisou(dest.id, agora)
  return 'avisado'
}

/** Dispara sem esperar: o aviso nao pode atrasar a resposta da pesquisa. */
export function avisaPesquisaDaReativacaoEmSegundoPlano(userId: string): void {
  void avisaPesquisaDaReativacao(userId).catch((error) => {
    logger.error(
      'Falha ao avisar pesquisa da reativacao',
      error instanceof Error ? error : undefined,
      '[reativacao]'
    )
  })
}

function dependenciasReais(): DependenciasAviso {
  return {
    async buscarUltimaOnda(userId, desde) {
      const r = await prisma.reactivationRecipient.findFirst({
        where: {
          userId,
          status: 'enviado',
          conversationId: { not: null },
          pesquisouEm: null,
          enviadoEm: { gte: desde }
        },
        orderBy: { enviadoEm: 'desc' },
        select: {
          id: true,
          conversationId: true,
          campaignId: true,
          campaign: { select: { nome: true, crmScenarioId: true, crmStepId: true } }
        }
      })
      if (!r || !r.conversationId) return null
      return {
        id: r.id,
        conversationId: r.conversationId,
        campanhaId: r.campaignId,
        campanha: r.campaign.nome,
        crmScenarioId: r.campaign.crmScenarioId,
        crmStepId: r.campaign.crmStepId
      }
    },
    async marcarPesquisou(destinatarioId, quando) {
      await prisma.reactivationRecipient.updateMany({
        where: { id: destinatarioId, pesquisouEm: null },
        data: { pesquisouEm: quando }
      })
    },
    async avisar(url, corpo) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
          signal: AbortSignal.timeout(10_000)
        })
        if (!res.ok) {
          logger.warn(`Aviso de pesquisa recusado pelo n8n (HTTP ${res.status})`, '[reativacao]')
        }
        return res.ok
      } catch (error) {
        logger.warn(
          `Aviso de pesquisa nao chegou ao n8n: ${error instanceof Error ? error.message : String(error)}`,
          '[reativacao]'
        )
        return false
      }
    },
    url: process.env.N8N_REATIVACAO_PESQUISOU_WEBHOOK_URL?.trim() || undefined
  }
}

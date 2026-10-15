import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
import { FREE_DAILY_QUOTA_CHAT_KINDS } from '@/lib/conversational-chat/config'
import { getUserLimits, getUserPeriod, type UserPeriod } from '@/lib/userPeriod'

/**
 * Cota diaria de pesquisas do plano gratuito.
 *
 * A cota e contada, nao guardada: sao as sessoes de pesquisa criadas desde o
 * inicio da janela. Por isso zerar nao apaga nada — o admin grava
 * `User.searchQuotaResetAt` e a janela passa a comecar ali. Apagar ou redatar as
 * sessoes tiraria a conversa do historico da pessoa, que e o oposto do que o
 * suporte quer quando libera mais pesquisas.
 *
 * A meia-noite e a do servidor, como sempre foi: em producao (UTC) a cota vira
 * as 21h de Brasilia.
 */
export function inicioDaCotaDiaria(
  searchQuotaResetAt: Date | null | undefined,
  agora: Date = new Date()
): Date {
  const meiaNoite = new Date(agora)
  meiaNoite.setHours(0, 0, 0, 0)
  if (searchQuotaResetAt && searchQuotaResetAt > meiaNoite) {
    return searchQuotaResetAt
  }
  return meiaNoite
}

export async function contarPesquisasDaCota(
  userId: string,
  searchQuotaResetAt: Date | null | undefined
): Promise<number> {
  return prisma.chatSession.count({
    where: {
      userId,
      // Cota compartilhada: o modo pesquisa (`/pesquisa`) consome o mesmo teto
      // diario que o chat conversacional.
      chatKind: { in: [...FREE_DAILY_QUOTA_CHAT_KINDS] },
      createdAt: { gte: inicioDaCotaDiaria(searchQuotaResetAt) }
    }
  })
}

export type StatusCotaPesquisa = {
  premium: boolean
  period: UserPeriod
  searchLimit: number
  usadasHoje: number
  /** Pesquisas do dia (desde a meia-noite), contando as anteriores ao reset. */
  feitasHoje: number
  searchQuotaResetAt: string | null
}

/** O que o admin precisa ver para decidir se zera a cota de alguem. */
export async function statusDaCotaDePesquisa(
  userId: string
): Promise<StatusCotaPesquisa | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, searchQuotaResetAt: true }
  })
  if (!user) return null

  const period = getUserPeriod(user.createdAt)
  const { searchLimit } = getUserLimits(period)
  const [premium, usadasHoje, feitasHoje] = await Promise.all([
    isUserPremium(userId),
    contarPesquisasDaCota(userId, user.searchQuotaResetAt),
    contarPesquisasDaCota(userId, null)
  ])

  return {
    premium,
    period,
    searchLimit,
    usadasHoje,
    feitasHoje,
    searchQuotaResetAt: user.searchQuotaResetAt?.toISOString() ?? null
  }
}

// src/lib/premiumUtils.ts
import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Status que ainda concedem acesso premium até currentPeriodEnd (comparação case-insensitive).
 * Inclui cancelamento ao fim do período e tolera "canceled/cancelled" com fim de período no futuro
 * (dados legados ou webhook fora de ordem).
 */
const PREMIUM_ACCESS_NORMALIZED = new Set([
  'active',
  'trialing',
  'past_due',
  'cancel_at_period_end',
  'paused'
])

/**
 * Para filtros Prisma: variantes comuns de capitalização no banco.
 */
export const PRISMA_PREMIUM_LIKE_STATUSES = [
  'active',
  'ACTIVE',
  'trialing',
  'TRIALING',
  'past_due',
  'PAST_DUE',
  'cancel_at_period_end',
  'CANCEL_AT_PERIOD_END',
  'paused',
  'PAUSED'
] as const

export const PRISMA_CANCELED_GRACE_STATUSES = [
  'canceled',
  'cancelled',
  'CANCELED',
  'CANCELLED'
] as const

export function subscriptionGrantsPremiumAccess(sub: {
  status: string
  currentPeriodEnd: Date
}): boolean {
  if (sub.currentPeriodEnd.getTime() < Date.now()) return false
  const s = sub.status.trim().toLowerCase()
  if (PREMIUM_ACCESS_NORMALIZED.has(s)) return true
  if (s === 'canceled' || s === 'cancelled') return true
  return false
}

/** Where Prisma: assinatura ainda "paga" até o fim do período (admin / contagens). */
export function prismaWhereSubscriptionGrantsPremium(
  now: Date = new Date()
): Prisma.SubscriptionWhereInput {
  return {
    currentPeriodEnd: { gte: now },
    OR: [
      { status: { in: [...PRISMA_PREMIUM_LIKE_STATUSES] } },
      { status: { in: [...PRISMA_CANCELED_GRACE_STATUSES] } }
    ]
  }
}

/** Status canceled/cancelled com período ainda vigente (acesso até o fim do ciclo). */
export function prismaWhereCanceledSubscriptionInGrace(
  now: Date = new Date()
): Prisma.SubscriptionWhereInput {
  return {
    currentPeriodEnd: { gte: now },
    status: { in: [...PRISMA_CANCELED_GRACE_STATUSES] }
  }
}

/** Canceladas e período já encerrado (não concedem mais acesso). */
export function prismaWhereCanceledSubscriptionEnded(
  now: Date = new Date()
): Prisma.SubscriptionWhereInput {
  return {
    currentPeriodEnd: { lt: now },
    status: { in: [...PRISMA_CANCELED_GRACE_STATUSES] }
  }
}

/**
 * Determina se um usuário é premium baseado na fonte de verdade do banco
 * Fonte única: tabela subscriptions com status ativo e período válido
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    if (user?.email && hasComplimentaryAccess(user.email, userId)) {
      return true
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        ...prismaWhereSubscriptionGrantsPremium()
      },
      select: {
        id: true
      }
    })

    return !!activeSubscription
  } catch (error) {
    console.error('Erro ao verificar se usuário é premium:', error)
    return false
  }
}

/**
 * Busca todos os usuários premium (com subscription ativa)
 */
export async function getPremiumUsers() {
  try {
    const premiumUsers = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: prismaWhereSubscriptionGrantsPremium()
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    return premiumUsers
  } catch (error) {
    console.error('Erro ao buscar usuários premium:', error)
    return []
  }
}

/**
 * Conta usuários premium baseado na fonte de verdade
 */
export async function countPremiumUsers(): Promise<number> {
  try {
    const count = await prisma.user.count({
      where: {
        subscriptions: {
          some: prismaWhereSubscriptionGrantsPremium()
        }
      }
    })

    return count
  } catch (error) {
    console.error('Erro ao contar usuários premium:', error)
    return 0
  }
}

/**
 * Query de conferência para validar contagem de premium
 * Esta é a fonte única de verdade para validação
 */
export const PREMIUM_VALIDATION_QUERY = `
SELECT COUNT(DISTINCT u.id) as premium_count
FROM "User" u
JOIN "Subscription" s ON u.id = s."userId"
WHERE s."currentPeriodEnd" >= NOW()
  AND (
    LOWER(TRIM(s.status)) IN ('active', 'trialing', 'past_due', 'cancel_at_period_end', 'paused')
    OR LOWER(TRIM(s.status)) IN ('canceled', 'cancelled')
  );
`

/**
 * Executa query de conferência para validar contagem
 */
export async function validatePremiumCount(): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe<[{ premium_count: bigint }]>(PREMIUM_VALIDATION_QUERY)
    return Number(result[0]?.premium_count || 0)
  } catch (error) {
    console.error('Erro ao validar contagem de premium:', error)
    return 0
  }
}

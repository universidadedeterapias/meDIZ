// src/lib/premiumUtils.ts
import { prisma } from '@/lib/prisma'

/**
 * Determina se um usuário é premium baseado na fonte de verdade do banco
 * Fonte única: tabela subscriptions com status ativo e período válido
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  try {
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: new Date()
        }
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
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
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
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
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
WHERE s.status IN ('active', 'ACTIVE', 'cancel_at_period_end')
  AND s."currentPeriodEnd" >= NOW()
  AND s."currentPeriodStart" <= NOW();
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

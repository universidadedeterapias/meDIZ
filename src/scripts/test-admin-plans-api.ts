// src/scripts/test-admin-plans-api.ts
// Simula a lógica da API /api/admin/plans para ver quais planos seriam retornados
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Testando lógica da API /api/admin/plans...\n')

    // 1. Buscar planos Hotmart ativos
    const hotmartPlans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { hotmartOfferKey: { not: null } }
        ],
        active: true
      }
    })

    console.log(`📊 Planos Hotmart ativos: ${hotmartPlans.length}`)
    hotmartPlans.forEach(p => {
      console.log(`   ✅ ${p.name} (${p.stripePriceId})`)
    })

    // 2. Buscar planos do Stripe com assinaturas ativas
    const stripePlansWithActiveSubs = await prisma.plan.findMany({
      where: {
        stripePriceId: {
          startsWith: 'price_',
          not: {
            contains: 'hotmart'
          }
        },
        subscriptions: {
          some: {
            stripeSubscriptionId: {
              startsWith: 'sub_',
              not: {
                startsWith: 'sub_admin_'
              }
            },
            status: {
              in: ['active', 'trialing', 'past_due', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            stripeSubscriptionId: {
              startsWith: 'sub_',
              not: {
                startsWith: 'sub_admin_'
              }
            },
            status: {
              in: ['active', 'trialing', 'past_due', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      }
    })

    console.log(`\n📊 Planos do Stripe com assinaturas ativas: ${stripePlansWithActiveSubs.length}`)
    stripePlansWithActiveSubs.forEach(p => {
      console.log(`   ✅ ${p.name} (${p.stripePriceId})`)
      console.log(`      Assinaturas ativas: ${p.subscriptions.length}`)
      p.subscriptions.forEach(sub => {
        console.log(`        - ${sub.status} até ${sub.currentPeriodEnd.toISOString().split('T')[0]}`)
      })
    })

    // 3. Combinar
    const allPlans = [...hotmartPlans, ...stripePlansWithActiveSubs]
    const uniquePlans = Array.from(
      new Map(allPlans.map(plan => [plan.id, plan])).values()
    )

    console.log(`\n📊 TOTAL DE PLANOS QUE APARECERÃO NO ADMIN: ${uniquePlans.length}`)
    console.log('\n📋 LISTA COMPLETA:')
    uniquePlans.forEach((p, index) => {
      const isStripe = p.stripePriceId.startsWith('price_') && !p.stripePriceId.includes('hotmart')
      console.log(`${index + 1}. ${p.name}`)
      console.log(`   Tipo: ${isStripe ? 'Stripe' : 'Hotmart'}`)
      console.log(`   stripePriceId: ${p.stripePriceId}`)
      console.log(`   Intervalo: ${p.interval || 'NULL'}`)
      console.log(`   Ativo: ${p.active ? '✅' : '❌'}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))



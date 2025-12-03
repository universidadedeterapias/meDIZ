// src/scripts/check-active-stripe-plans.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Buscar planos do Stripe que têm assinaturas ativas
    const activeStripeSubs = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: {
          startsWith: 'sub_',
          not: {
            startsWith: 'sub_admin_'
          }
        },
        status: {
          in: ['active', 'trialing', 'past_due']
        }
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            stripePriceId: true,
            active: true,
            interval: true,
            amount: true,
            currency: true
          }
        }
      },
      distinct: ['planId']
    })

    console.log(`📊 Planos do Stripe com assinaturas ATIVAS: ${activeStripeSubs.length}\n`)

    if (activeStripeSubs.length > 0) {
      console.log('📋 PLANOS DO STRIPE EM USO (ATIVOS):\n')
      activeStripeSubs.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.plan.name}`)
        console.log(`   ID: ${sub.plan.id}`)
        console.log(`   stripePriceId: ${sub.plan.stripePriceId}`)
        console.log(`   Intervalo: ${sub.plan.interval || 'NULL'}`)
        console.log(`   Valor: ${sub.plan.amount ? `${sub.plan.currency?.toUpperCase() || 'BRL'} ${(sub.plan.amount / 100).toFixed(2)}` : 'NULL'}`)
        console.log(`   Status no banco: ${sub.plan.active ? '✅ Ativo' : '❌ Inativo'}`)
        console.log('')
      })

      // Contar quantas assinaturas ativas cada plano tem
      console.log('\n📊 QUANTIDADE DE ASSINATURAS ATIVAS POR PLANO:\n')
      for (const sub of activeStripeSubs) {
        const count = await prisma.subscription.count({
          where: {
            planId: sub.plan.id,
            stripeSubscriptionId: {
              startsWith: 'sub_',
              not: {
                startsWith: 'sub_admin_'
              }
            },
            status: {
              in: ['active', 'trialing', 'past_due']
            }
          }
        })
        console.log(`${sub.plan.name}: ${count} assinatura(s) ativa(s)`)
      }
    } else {
      console.log('❌ Nenhum plano do Stripe com assinaturas ativas encontrado.')
    }

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



// src/scripts/check-stripe-plans-in-admin.ts
// Script para verificar quais planos Stripe aparecem no painel admin

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStripePlansInAdmin() {
  try {
    console.log('🔍 Verificando planos Stripe no banco e no painel admin...\n')

    // 1. Buscar TODOS os planos Stripe no banco
    const allStripePlans = await prisma.plan.findMany({
      where: {
        stripePriceId: {
          startsWith: 'price_',
          not: {
            contains: 'hotmart'
          }
        }
      },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        },
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
          },
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    console.log(`📊 Total de planos Stripe no banco: ${allStripePlans.length}\n`)

    // 2. Verificar quais apareceriam no admin (baseado na lógica atual)
    console.log('📋 PLANOS STRIPE NO BANCO:\n')
    console.log('='.repeat(80))

    let activeInDb = 0
    let withActiveSubs = 0
    let wouldAppearInAdmin = 0

    allStripePlans.forEach((plan, index) => {
      const isActive = plan.active
      const hasActiveSubs = plan.subscriptions.length > 0
      const wouldAppear = isActive || hasActiveSubs

      if (isActive) activeInDb++
      if (hasActiveSubs) withActiveSubs++
      if (wouldAppear) wouldAppearInAdmin++

      console.log(`\n${index + 1}. ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Ativo no banco: ${isActive ? '✅' : '❌'}`)
      console.log(`   Assinaturas ativas: ${plan.subscriptions.length}`)
      console.log(`   Total de assinaturas: ${plan._count.subscriptions}`)
      console.log(`   Apareceria no admin: ${wouldAppear ? '✅ SIM' : '❌ NÃO'}`)
      
      if (!wouldAppear) {
        console.log(`   ⚠️  MOTIVO: Não está ativo E não tem assinaturas ativas`)
      }
    })

    console.log('\n\n📈 RESUMO:')
    console.log('='.repeat(80))
    console.log(`   Total de planos Stripe no banco: ${allStripePlans.length}`)
    console.log(`   Planos ativos no banco: ${activeInDb}`)
    console.log(`   Planos com assinaturas ativas: ${withActiveSubs}`)
    console.log(`   Planos que apareceriam no admin: ${wouldAppearInAdmin}`)
    console.log(`   Planos que NÃO aparecem no admin: ${allStripePlans.length - wouldAppearInAdmin}`)

    if (wouldAppearInAdmin < allStripePlans.length) {
      console.log('\n⚠️  ATENÇÃO: Alguns planos Stripe não aparecem no painel admin!')
      console.log('   Motivo: Não estão marcados como ativos E não têm assinaturas ativas')
      console.log('   Solução: Marcar os planos como active: true no banco de dados')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar planos Stripe:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkStripePlansInAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { checkStripePlansInAdmin }



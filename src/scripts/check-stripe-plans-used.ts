// src/scripts/check-stripe-plans-used.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Buscar assinaturas do Stripe (stripeSubscriptionId começa com "sub_" mas não "sub_admin_")
    const stripeSubs = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: {
          startsWith: 'sub_',
          not: {
            startsWith: 'sub_admin_'
          }
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
            hotmartOfferKey: true
          }
        }
      },
      distinct: ['planId']
    })

    console.log(`📊 Planos usados em assinaturas do Stripe: ${stripeSubs.length}\n`)

    if (stripeSubs.length > 0) {
      console.log('📋 PLANOS DO STRIPE USADOS NAS ASSINATURAS:\n')
      stripeSubs.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.plan.name}`)
        console.log(`   ID: ${sub.plan.id}`)
        console.log(`   stripePriceId: ${sub.plan.stripePriceId}`)
        console.log(`   Intervalo: ${sub.plan.interval || 'NULL'}`)
        console.log(`   Ativo: ${sub.plan.active ? '✅' : '❌'}`)
        console.log('')
      })
    }

    // Verificar se esses planos apareceriam no admin
    console.log('\n🔍 VERIFICAÇÃO NO PAINEL ADMIN:\n')
    console.log('A API /api/admin/plans filtra apenas:')
    console.log('  - stripePriceId contém "hotmart" OU')
    console.log('  - hotmartOfferKey não é null')
    console.log('  - active = true\n')

    stripeSubs.forEach(sub => {
      const wouldAppear = 
        (sub.plan.stripePriceId.includes('hotmart') || sub.plan.hotmartOfferKey !== null) &&
        sub.plan.active

      console.log(`${sub.plan.name}:`)
      console.log(`  Aparece no admin? ${wouldAppear ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`  Motivo: ${!sub.plan.active ? 'Plano inativo' : 'Não é plano Hotmart'}`)
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



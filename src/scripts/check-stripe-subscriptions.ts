// src/scripts/check-stripe-subscriptions.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Buscar todas as subscriptions
    const allSubs = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            name: true,
            stripePriceId: true
          }
        },
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Total de assinaturas no banco: ${allSubs.length}\n`)

    // Filtrar apenas as que têm stripeSubscriptionId do Stripe (começam com "sub_")
    const stripeSubs = allSubs.filter(sub => 
      sub.stripeSubscriptionId.startsWith('sub_')
    )

    console.log(`✅ Assinaturas do Stripe (stripeSubscriptionId começa com "sub_"): ${stripeSubs.length}\n`)

    if (stripeSubs.length > 0) {
      console.log('📋 ASSINATURAS DO STRIPE:\n')
      stripeSubs.forEach((sub, index) => {
        console.log(`${index + 1}. ${sub.user.email || sub.user.name || 'N/A'}`)
        console.log(`   stripeSubscriptionId: ${sub.stripeSubscriptionId}`)
        console.log(`   Plano: ${sub.plan.name} (${sub.plan.stripePriceId})`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Período: ${sub.currentPeriodStart.toISOString()} até ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`   Criada em: ${sub.createdAt.toISOString()}`)
        console.log('')
      })
    } else {
      console.log('❌ Nenhuma assinatura do Stripe encontrada no banco.')
    }

    // Mostrar outras subscriptions (Hotmart, etc)
    const otherSubs = allSubs.filter(sub => 
      !sub.stripeSubscriptionId.startsWith('sub_')
    )

    if (otherSubs.length > 0) {
      console.log(`\n📊 Outras assinaturas (não Stripe): ${otherSubs.length}`)
      console.log('   (Essas são provavelmente da Hotmart)')
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



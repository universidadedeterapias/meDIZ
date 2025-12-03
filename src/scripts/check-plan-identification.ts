// src/scripts/check-plan-identification.ts
// Script para verificar como os planos são identificados (Hotmart vs Stripe)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPlanIdentification() {
  try {
    console.log('🔍 Verificando identificação de planos (Hotmart vs Stripe)...\n')

    // Buscar TODOS os planos
    const allPlans = await prisma.plan.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Total de planos no banco: ${allPlans.length}\n`)

    // Categorizar planos
    const hotmartPlans: typeof allPlans = []
    const stripePlans: typeof allPlans = []
    const unclearPlans: typeof allPlans = []

    allPlans.forEach(plan => {
      const hasHotmartId = plan.hotmartId !== null
      const hasHotmartOfferKey = plan.hotmartOfferKey !== null
      const hasStripePriceId = plan.stripePriceId?.startsWith('price_') || false
      const stripePriceIdContainsHotmart = plan.stripePriceId?.includes('hotmart') || false

      // Lógica de identificação (mesma da API admin/plans)
      const isHotmart = stripePriceIdContainsHotmart || hasHotmartOfferKey || hasHotmartId
      const isStripe = hasStripePriceId && !stripePriceIdContainsHotmart && !hasHotmartId

      if (isHotmart) {
        hotmartPlans.push(plan)
      } else if (isStripe) {
        stripePlans.push(plan)
      } else {
        unclearPlans.push(plan)
      }
    })

    console.log('📋 PLANOS HOTMART (segundo lógica da API):')
    console.log('='.repeat(80))
    hotmartPlans.forEach((plan, index) => {
      console.log(`\n${index + 1}. ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId || 'não disponível'}`)
      console.log(`   hotmartId: ${plan.hotmartId || 'não disponível'}`)
      console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
      console.log(`   Moeda: ${plan.currency || 'não definida'}`)
      console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
      console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
    })

    console.log('\n\n📋 PLANOS STRIPE (segundo lógica da API):')
    console.log('='.repeat(80))
    stripePlans.forEach((plan, index) => {
      console.log(`\n${index + 1}. ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId || 'não disponível'}`)
      console.log(`   hotmartId: ${plan.hotmartId || 'não disponível'}`)
      console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
      console.log(`   Moeda: ${plan.currency || 'não definida'}`)
      console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
      console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
    })

    if (unclearPlans.length > 0) {
      console.log('\n\n⚠️  PLANOS COM IDENTIFICAÇÃO INCERTA:')
      console.log('='.repeat(80))
      unclearPlans.forEach((plan, index) => {
        console.log(`\n${index + 1}. ${plan.name}`)
        console.log(`   ID: ${plan.id}`)
        console.log(`   stripePriceId: ${plan.stripePriceId || 'não disponível'}`)
        console.log(`   hotmartId: ${plan.hotmartId || 'não disponível'}`)
        console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
        console.log(`   Moeda: ${plan.currency || 'não definida'}`)
        console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
        console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      })
    }

    console.log('\n\n📈 RESUMO:')
    console.log('='.repeat(80))
    console.log(`   Planos Hotmart: ${hotmartPlans.length}`)
    console.log(`   Planos Stripe: ${stripePlans.length}`)
    console.log(`   Planos incertos: ${unclearPlans.length}`)

    // Verificar assinaturas
    console.log('\n\n🔍 VERIFICANDO ASSINATURAS:')
    console.log('='.repeat(80))

    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            stripePriceId: true,
            hotmartId: true,
            hotmartOfferKey: true,
            currency: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      },
      take: 20,
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 Mostrando ${subscriptions.length} assinaturas mais recentes:\n`)

    subscriptions.forEach((sub, index) => {
      const isHotmart = sub.plan.hotmartId !== null || sub.plan.hotmartOfferKey !== null
      const isStripe = sub.plan.stripePriceId?.startsWith('price_') && !sub.plan.stripePriceId.includes('hotmart')
      
      console.log(`${index + 1}. ${sub.user.email}`)
      console.log(`   Plano: "${sub.plan.name}"`)
      console.log(`   stripePriceId: ${sub.plan.stripePriceId || 'não disponível'}`)
      console.log(`   hotmartId: ${sub.plan.hotmartId || 'não disponível'}`)
      console.log(`   Identificado como: ${isHotmart ? '🔵 HOTMART' : isStripe ? '💳 STRIPE' : '❓ INCERTO'}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkPlanIdentification()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { checkPlanIdentification }



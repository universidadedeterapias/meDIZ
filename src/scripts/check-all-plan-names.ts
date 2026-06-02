// src/scripts/check-all-plan-names.ts
// Script para verificar todos os nomes de planos e assinaturas no banco

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAllPlanNames() {
  try {
    console.log('🔍 Verificando todos os planos e assinaturas no banco...\n')

    // Buscar todos os planos
    const allPlans = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        hotmartId: true,
        hotmartOfferKey: true,
        stripePriceId: true,
        currency: true,
        interval: true,
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

    // Separar planos Hotmart e Stripe
    const hotmartPlans = allPlans.filter(p => p.hotmartId !== null)
    const stripePlans = allPlans.filter(p => p.stripePriceId?.startsWith('price_') && !p.hotmartId)
    const otherPlans = allPlans.filter(p => !p.hotmartId && !p.stripePriceId?.startsWith('price_'))

    console.log(`🔵 Planos Hotmart: ${hotmartPlans.length}`)
    console.log(`💳 Planos Stripe: ${stripePlans.length}`)
    console.log(`❓ Outros planos: ${otherPlans.length}\n`)

    // Mostrar planos Hotmart
    if (hotmartPlans.length > 0) {
      console.log('📋 PLANOS HOTMART:')
      console.log('='.repeat(80))
      hotmartPlans.forEach(plan => {
        console.log(`\n🔵 ID: ${plan.id}`)
        console.log(`   Nome: "${plan.name}"`)
        console.log(`   hotmartId: ${plan.hotmartId}`)
        console.log(`   OfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
        console.log(`   Moeda: ${plan.currency || 'não definida'}`)
        console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
        console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      })
    }

    // Mostrar planos Stripe
    if (stripePlans.length > 0) {
      console.log('\n\n📋 PLANOS STRIPE:')
      console.log('='.repeat(80))
      stripePlans.forEach(plan => {
        console.log(`\n💳 ID: ${plan.id}`)
        console.log(`   Nome: "${plan.name}"`)
        console.log(`   stripePriceId: ${plan.stripePriceId}`)
        console.log(`   Moeda: ${plan.currency || 'não definida'}`)
        console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
        console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      })
    }

    // Mostrar outros planos
    if (otherPlans.length > 0) {
      console.log('\n\n📋 OUTROS PLANOS:')
      console.log('='.repeat(80))
      otherPlans.forEach(plan => {
        console.log(`\n❓ ID: ${plan.id}`)
        console.log(`   Nome: "${plan.name}"`)
        console.log(`   stripePriceId: ${plan.stripePriceId || 'não disponível'}`)
        console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
        console.log(`   Moeda: ${plan.currency || 'não definida'}`)
        console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
        console.log(`   Assinaturas: ${plan._count.subscriptions}`)
      })
    }

    // Verificar assinaturas com nomes potencialmente incorretos
    console.log('\n\n📋 VERIFICANDO ASSINATURAS:')
    console.log('='.repeat(80))

    const subscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            hotmartId: true,
            hotmartOfferKey: true,
            stripePriceId: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Mostrar apenas as 20 mais recentes
    })

    console.log(`\n📊 Mostrando as ${subscriptions.length} assinaturas mais recentes:\n`)

    subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. Assinatura ID: ${sub.id}`)
      console.log(`   Usuário: ${sub.user.email}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   Plano ID: ${sub.plan.id}`)
      console.log(`   Nome do plano: "${sub.plan.name}"`)
      console.log(`   hotmartId: ${sub.plan.hotmartId || 'não disponível'}`)
      console.log(`   OfferKey: ${sub.plan.hotmartOfferKey || 'não disponível'}`)
      console.log(`   stripePriceId: ${sub.plan.stripePriceId || 'não disponível'}`)
    })

    console.log('\n\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro ao verificar planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkAllPlanNames()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { checkAllPlanNames }



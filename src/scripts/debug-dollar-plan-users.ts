// src/scripts/debug-dollar-plan-users.ts
// Script para investigar por que há múltiplos clientes com plano dólar

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugDollarPlanUsers() {
  try {
    console.log('🔍 Investigando planos em dólar no banco de dados...\n')

    // 1. Buscar todos os planos em dólar
    const dollarPlans = await prisma.plan.findMany({
      where: {
        currency: 'USD'
      },
      include: {
        subscriptions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                fullName: true,
                createdAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    console.log(`📊 Planos em dólar encontrados: ${dollarPlans.length}\n`)

    dollarPlans.forEach(plan => {
      console.log(`\n💵 PLANO: ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   hotmartId: ${plan.hotmartId || 'não disponível'}`)
      console.log(`   OfferKey: ${plan.hotmartOfferKey || 'não disponível'}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Moeda: ${plan.currency}`)
      console.log(`   Valor: ${plan.amount ? (plan.amount / 100).toFixed(2) : 'não definido'}`)
      console.log(`   Intervalo: ${plan.interval || 'não definido'}`)
      console.log(`   Total de assinaturas: ${plan.subscriptions.length}`)

      if (plan.subscriptions.length > 0) {
        console.log(`\n   📋 ASSINATURAS:`)
        plan.subscriptions.forEach((sub, index) => {
          console.log(`\n   ${index + 1}. Assinatura ID: ${sub.id}`)
          console.log(`      Usuário: ${sub.user.email}`)
          console.log(`      Nome: ${sub.user.name || sub.user.fullName || 'Sem nome'}`)
          console.log(`      Status: ${sub.status}`)
          console.log(`      Criada em: ${sub.createdAt.toISOString()}`)
          console.log(`      Período atual: ${sub.currentPeriodStart.toISOString()} até ${sub.currentPeriodEnd.toISOString()}`)
          console.log(`      stripeSubscriptionId: ${sub.stripeSubscriptionId}`)
        })
      }
    })

    // 2. Buscar especificamente pela cliente mencionada
    console.log('\n\n🔍 VERIFICANDO CLIENTE ESPECÍFICA: tana.conceicao@gmail.com')
    console.log('='.repeat(80))

    const specificUser = await prisma.user.findUnique({
      where: {
        email: 'tana.conceicao@gmail.com'
      },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                hotmartId: true,
                hotmartOfferKey: true,
                stripePriceId: true,
                currency: true,
                amount: true,
                interval: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!specificUser) {
      console.log('❌ Cliente não encontrada no banco de dados!')
    } else {
      console.log(`\n✅ Cliente encontrada:`)
      console.log(`   ID: ${specificUser.id}`)
      console.log(`   Nome: ${specificUser.name || specificUser.fullName || 'Sem nome'}`)
      console.log(`   Email: ${specificUser.email}`)
      console.log(`   Criada em: ${specificUser.createdAt.toISOString()}`)
      console.log(`   Total de assinaturas: ${specificUser.subscriptions.length}`)

      if (specificUser.subscriptions.length > 0) {
        console.log(`\n   📋 ASSINATURAS DA CLIENTE:`)
        specificUser.subscriptions.forEach((sub, index) => {
          console.log(`\n   ${index + 1}. Assinatura ID: ${sub.id}`)
          console.log(`      Status: ${sub.status}`)
          console.log(`      Criada em: ${sub.createdAt.toISOString()}`)
          console.log(`      Plano ID: ${sub.plan.id}`)
          console.log(`      Nome do plano: "${sub.plan.name}"`)
          console.log(`      Moeda: ${sub.plan.currency || 'não definida'}`)
          console.log(`      hotmartId: ${sub.plan.hotmartId || 'não disponível'}`)
          console.log(`      OfferKey: ${sub.plan.hotmartOfferKey || 'não disponível'}`)
          console.log(`      stripePriceId: ${sub.plan.stripePriceId}`)
          console.log(`      stripeSubscriptionId: ${sub.stripeSubscriptionId}`)
        })
      } else {
        console.log(`\n   ⚠️ Cliente não tem assinaturas!`)
      }
    }

    // 3. Verificar todas as assinaturas com planos USD
    console.log('\n\n🔍 TODAS AS ASSINATURAS COM PLANOS USD:')
    console.log('='.repeat(80))

    const allDollarSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: {
          currency: 'USD'
        }
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            hotmartId: true,
            hotmartOfferKey: true,
            stripePriceId: true,
            currency: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            fullName: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n📊 Total de assinaturas com planos USD: ${allDollarSubscriptions.length}\n`)

    allDollarSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Assinatura ID: ${sub.id}`)
      console.log(`   Usuário: ${sub.user.email}`)
      console.log(`   Nome: ${sub.user.name || sub.user.fullName || 'Sem nome'}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   Criada em: ${sub.createdAt.toISOString()}`)
      console.log(`   Plano: "${sub.plan.name}"`)
      console.log(`   hotmartId: ${sub.plan.hotmartId || 'não disponível'}`)
      console.log(`   OfferKey: ${sub.plan.hotmartOfferKey || 'não disponível'}`)
      console.log(`   stripePriceId: ${sub.plan.stripePriceId}`)
      console.log(`   stripeSubscriptionId: ${sub.stripeSubscriptionId}`)
      console.log('')
    })

    // 4. Verificar se há planos BRL sendo identificados incorretamente como USD
    console.log('\n\n🔍 VERIFICANDO POSSÍVEIS PROBLEMAS DE IDENTIFICAÇÃO:')
    console.log('='.repeat(80))

    // Buscar planos que têm hotmartId 1197626 (Plano Mensal - Dólar) mas podem estar sendo usados incorretamente
    const dollarPlanId = 1197626
    const dollarPlan = await prisma.plan.findUnique({
      where: {
        hotmartId: dollarPlanId
      },
      include: {
        subscriptions: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (dollarPlan) {
      console.log(`\n💵 Plano dólar (hotmartId: ${dollarPlanId}):`)
      console.log(`   Nome: "${dollarPlan.name}"`)
      console.log(`   Moeda: ${dollarPlan.currency}`)
      console.log(`   Total de assinaturas: ${dollarPlan.subscriptions.length}`)
      
      if (dollarPlan.subscriptions.length > 0) {
        console.log(`\n   📋 Usuários com este plano:`)
        dollarPlan.subscriptions.forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.user.email} - Status: ${sub.status} - Criada em: ${sub.createdAt.toISOString()}`)
        })
      }
    }

    // Verificar se há planos BRL que podem estar sendo confundidos
    const brlPlans = await prisma.plan.findMany({
      where: {
        currency: 'BRL',
        interval: 'MONTH'
      },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    })

    console.log(`\n\n📊 Planos BRL mensais disponíveis:`)
    brlPlans.forEach(plan => {
      console.log(`   - ${plan.name} (hotmartId: ${plan.hotmartId || 'não disponível'}) - ${plan._count.subscriptions} assinaturas`)
    })

  } catch (error) {
    console.error('❌ Erro ao investigar planos em dólar:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugDollarPlanUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { debugDollarPlanUsers }



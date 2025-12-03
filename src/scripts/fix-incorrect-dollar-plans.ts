// src/scripts/fix-incorrect-dollar-plans.ts
// Script para corrigir planos dólar incorretos, mantendo apenas tana.conceicao@gmail.com como dólar

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixIncorrectDollarPlans() {
  try {
    console.log('🔧 Corrigindo planos dólar incorretos...\n')

    // Cliente que DEVE ter plano dólar (única compra real)
    const CORRECT_DOLLAR_USER = 'tana.conceicao@gmail.com'

    // Buscar plano dólar mensal (hotmartId: 1197626)
    const dollarPlan = await prisma.plan.findUnique({
      where: {
        hotmartId: 1197626 // Plano Mensal - Dólar
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

    if (!dollarPlan) {
      console.log('❌ Plano dólar não encontrado!')
      return
    }

    console.log(`📊 Plano dólar encontrado: "${dollarPlan.name}"`)
    console.log(`   Total de assinaturas: ${dollarPlan.subscriptions.length}\n`)

    // Buscar plano BRL mensal correto (hotmartId: 1115304 - Plano Profissional | Mensal)
    const brlPlan = await prisma.plan.findUnique({
      where: {
        hotmartId: 1115304 // Plano Profissional | Mensal
      }
    })

    if (!brlPlan) {
      console.log('❌ Plano BRL mensal não encontrado!')
      return
    }

    console.log(`📊 Plano BRL correto encontrado: "${brlPlan.name}"\n`)

    let corrected = 0
    let kept = 0
    let errors = 0

    // Processar cada assinatura
    for (const subscription of dollarPlan.subscriptions) {
      const userEmail = subscription.user.email

      if (userEmail === CORRECT_DOLLAR_USER) {
        // Manter esta assinatura como dólar (está correta)
        console.log(`✅ Mantendo plano dólar para: ${userEmail}`)
        kept++
      } else {
        // Corrigir para plano BRL
        try {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              planId: brlPlan.id
            }
          })
          console.log(`🔄 Corrigido: ${userEmail}`)
          console.log(`   De: "${dollarPlan.name}" (USD)`)
          console.log(`   Para: "${brlPlan.name}" (BRL)`)
          corrected++
        } catch (error) {
          console.error(`❌ Erro ao corrigir assinatura ${subscription.id} (${userEmail}):`, error)
          errors++
        }
      }
    }

    // Verificar se tana.conceicao@gmail.com tem plano BRL e precisa ser corrigida para dólar
    const tanaUser = await prisma.user.findUnique({
      where: {
        email: CORRECT_DOLLAR_USER
      },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                hotmartId: true,
                currency: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1 // Pegar a mais recente
        }
      }
    })

    if (tanaUser && tanaUser.subscriptions.length > 0) {
      const tanaSubscription = tanaUser.subscriptions[0]
      if (tanaSubscription.plan.currency !== 'USD' || tanaSubscription.plan.hotmartId !== 1197626) {
        console.log(`\n🔄 Corrigindo assinatura de ${CORRECT_DOLLAR_USER} para plano dólar...`)
        try {
          await prisma.subscription.update({
            where: { id: tanaSubscription.id },
            data: {
              planId: dollarPlan.id
            }
          })
          console.log(`✅ ${CORRECT_DOLLAR_USER} agora tem plano dólar correto`)
          corrected++
        } catch (error) {
          console.error(`❌ Erro ao corrigir assinatura de ${CORRECT_DOLLAR_USER}:`, error)
          errors++
        }
      } else {
        console.log(`\n✅ ${CORRECT_DOLLAR_USER} já tem plano dólar correto`)
      }
    }

    console.log('\n📈 Resumo:')
    console.log(`   🔄 Corrigidos: ${corrected}`)
    console.log(`   ✅ Mantidos (corretos): ${kept}`)
    console.log(`   ❌ Erros: ${errors}`)
    console.log('\n🎉 Correção concluída!')

  } catch (error) {
    console.error('❌ Erro ao corrigir planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixIncorrectDollarPlans()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { fixIncorrectDollarPlans }



// Script para verificar planos Stripe no banco e no painel admin
import { PrismaClient } from '@prisma/client'
import { subscriptionGrantsPremiumAccess } from '@/lib/premiumUtils'

const prisma = new PrismaClient()

async function checkStripePlans() {
  try {
    console.log('🔍 Verificando planos Stripe no banco de dados...\n')

    // 1. Buscar TODOS os planos Stripe no banco (não apenas os com assinaturas ativas)
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
        subscriptions: {
          where: {
            stripeSubscriptionId: {
              startsWith: 'sub_',
              not: {
                startsWith: 'sub_admin_'
              }
            }
          },
          select: {
            id: true,
            status: true,
            currentPeriodEnd: true,
            stripeSubscriptionId: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Total de planos Stripe no banco: ${allStripePlans.length}\n`)

    if (allStripePlans.length === 0) {
      console.log('⚠️  Nenhum plano Stripe encontrado no banco!')
      return
    }

    // 2. Verificar quais têm assinaturas ativas
    const plansWithActiveSubs = allStripePlans.filter(plan => {
      return plan.subscriptions.some(sub => subscriptionGrantsPremiumAccess(sub))
    })

    console.log(`✅ Planos com assinaturas ativas: ${plansWithActiveSubs.length}`)
    console.log(`⚠️  Planos sem assinaturas ativas: ${allStripePlans.length - plansWithActiveSubs.length}\n`)

    // 3. Detalhes de cada plano
    console.log('📋 Detalhes dos planos Stripe:\n')
    allStripePlans.forEach((plan, index) => {
      const hasActiveSubs = plansWithActiveSubs.includes(plan)
      const statusIcon = hasActiveSubs ? '✅' : '⚠️'
      
      console.log(`${statusIcon} ${index + 1}. ${plan.name}`)
      console.log(`   ID: ${plan.id}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Status no banco: ${plan.active ? '✅ Ativo' : '❌ Inativo'}`)
      console.log(`   Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`   Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`   Valor: ${plan.amount ? (plan.amount / 100).toFixed(2) : 'NÃO DEFINIDO'} ${plan.currency || ''}`)
      console.log(`   Total de assinaturas: ${plan.subscriptions.length}`)
      
      if (plan.subscriptions.length > 0) {
        const activeSubs = plan.subscriptions.filter(sub =>
          subscriptionGrantsPremiumAccess(sub)
        )
        console.log(`   Assinaturas ativas: ${activeSubs.length}`)
        
        if (activeSubs.length === 0) {
          console.log(`   ⚠️  Nenhuma assinatura ativa - plano NÃO aparecerá no painel admin`)
        } else {
          console.log(`   ✅ Tem assinaturas ativas - plano APARECERÁ no painel admin`)
        }
      } else {
        console.log(`   ⚠️  Nenhuma assinatura - plano NÃO aparecerá no painel admin`)
      }
      console.log('')
    })

    // 4. Resumo
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO')
    console.log('='.repeat(60))
    console.log(`\nTotal de planos Stripe no banco: ${allStripePlans.length}`)
    console.log(`Planos que aparecerão no painel admin: ${plansWithActiveSubs.length}`)
    console.log(`Planos que NÃO aparecerão no painel admin: ${allStripePlans.length - plansWithActiveSubs.length}`)

    if (plansWithActiveSubs.length < allStripePlans.length) {
      console.log('\n⚠️  ATENÇÃO: Alguns planos Stripe não aparecerão no painel admin porque:')
      console.log('   - Não têm assinaturas ativas')
      console.log('   - Ou todas as assinaturas expiraram')
      console.log('\n💡 A API /api/admin/plans só retorna planos Stripe com assinaturas ativas')
    }

    // 5. Verificar se há planos Stripe inativos que deveriam estar ativos
    const inactivePlans = allStripePlans.filter(p => !p.active)
    if (inactivePlans.length > 0) {
      console.log(`\n⚠️  Planos Stripe marcados como INATIVOS no banco: ${inactivePlans.length}`)
      inactivePlans.forEach(p => {
        console.log(`   - ${p.name} (${p.stripePriceId})`)
      })
    }

  } catch (error) {
    console.error('❌ Erro ao verificar planos Stripe:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkStripePlans()
  .then(() => {
    console.log('\n✅ Verificação concluída')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })



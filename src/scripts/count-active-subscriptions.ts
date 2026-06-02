// src/scripts/count-active-subscriptions.ts
import { prisma } from '@/lib/prisma'

async function countActiveSubscriptions() {
  console.log('📊 ASSINATURAS QUE FICARAM ONLINE NOS ÚLTIMOS 15 DIAS\n')
  console.log('=' .repeat(60))

  try {
    const now = new Date()
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    // Assinaturas que foram criadas OU atualizadas nos últimos 15 dias E estão ativas agora
    const activatedLast15Days = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: now
        },
        OR: [
          {
            createdAt: {
              gte: fifteenDaysAgo
            }
          },
          {
            updatedAt: {
              gte: fifteenDaysAgo
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    console.log(`\n🆕 TOTAL: ${activatedLast15Days.length} assinaturas ficaram online nos últimos 15 dias`)
    console.log(`   Período: ${fifteenDaysAgo.toISOString()} até ${now.toISOString()}`)

    // Separar novas vs renovações
    const newSubscriptions = activatedLast15Days.filter(sub => {
      const daysSinceCreation = Math.floor((now.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation <= 15
    })

    const renewedSubscriptions = activatedLast15Days.filter(sub => {
      const daysSinceCreation = Math.floor((now.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation > 15
    })

    console.log(`\n   📊 Detalhamento:`)
    console.log(`      🆕 Novas assinaturas: ${newSubscriptions.length}`)
    console.log(`      🔄 Renovações/atualizações: ${renewedSubscriptions.length}`)

    // Distribuição por provedor
    const byProvider: Record<string, number> = {}
    const byPlan: Record<string, number> = {}

    activatedLast15Days.forEach(sub => {
      // Identificar provedor
      let provider = 'Desconhecido'
      if (sub.stripeSubscriptionId?.startsWith('hotmart_')) {
        provider = 'Hotmart'
      } else if (sub.stripeSubscriptionId?.startsWith('sub_') && !sub.stripeSubscriptionId.startsWith('sub_admin_')) {
        provider = 'Stripe'
      } else if (sub.stripeSubscriptionId?.startsWith('sub_admin_')) {
        provider = 'Admin'
      }

      byProvider[provider] = (byProvider[provider] || 0) + 1

      const planName = sub.plan?.name || 'Sem plano'
      byPlan[planName] = (byPlan[planName] || 0) + 1
    })

    console.log(`\n   📦 Distribuição por provedor:`)
    Object.entries(byProvider)
      .sort(([, a], [, b]) => b - a)
      .forEach(([provider, count]) => {
        console.log(`      ${provider}: ${count}`)
      })

    console.log(`\n   💳 Distribuição por plano:`)
    Object.entries(byPlan)
      .sort(([, a], [, b]) => b - a)
      .forEach(([plan, count]) => {
        console.log(`      ${plan}: ${count}`)
      })

    // Listar todas as assinaturas que ficaram online
    console.log(`\n   📋 LISTA COMPLETA (${activatedLast15Days.length} assinaturas):`)
    activatedLast15Days.forEach((sub, index) => {
      const activationDate = sub.updatedAt > sub.createdAt ? sub.updatedAt : sub.createdAt
      const daysAgo = Math.floor((now.getTime() - activationDate.getTime()) / (1000 * 60 * 60 * 24))
      const isNew = sub.createdAt >= fifteenDaysAgo
      
      console.log(`\n   ${index + 1}. ${sub.user.email} ${sub.user.name ? `(${sub.user.name})` : ''}`)
      console.log(`      Tipo: ${isNew ? '🆕 Nova' : '🔄 Renovada/Atualizada'}`)
      console.log(`      Plano: ${sub.plan?.name || 'Sem plano'}`)
      console.log(`      ${isNew ? 'Criada' : 'Atualizada'} há: ${daysAgo} dias`)
      console.log(`      Data: ${activationDate.toISOString()}`)
      console.log(`      Expira em: ${sub.currentPeriodEnd.toISOString()}`)
      console.log(`      Provedor: ${sub.stripeSubscriptionId?.startsWith('hotmart_') ? 'Hotmart' : sub.stripeSubscriptionId?.startsWith('sub_admin_') ? 'Admin' : sub.stripeSubscriptionId?.startsWith('sub_') ? 'Stripe' : 'Desconhecido'}`)
    })

    // Contagem total de assinaturas ativas (para referência)
    const totalActive = await prisma.subscription.count({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: now
        }
      }
    })

    console.log(`\n\n📊 RESUMO:`)
    console.log(`   ✅ Total de assinaturas ativas (todas): ${totalActive}`)
    console.log(`   🆕 Ficaram online nos últimos 15 dias: ${activatedLast15Days.length}`)
    console.log(`      - Novas: ${newSubscriptions.length}`)
    console.log(`      - Renovações: ${renewedSubscriptions.length}`)

  } catch (error) {
    console.error('❌ Erro na contagem:', error)
  } finally {
    await prisma.$disconnect()
  }
}

countActiveSubscriptions()

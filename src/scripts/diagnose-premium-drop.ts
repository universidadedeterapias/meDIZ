// src/scripts/diagnose-premium-drop.ts
import { prisma } from '@/lib/prisma'
import {
  countPremiumUsers,
  PRISMA_PREMIUM_LIKE_STATUSES,
  prismaWhereSubscriptionGrantsPremium,
  subscriptionGrantsPremiumAccess,
  validatePremiumCount
} from '@/lib/premiumUtils'

async function diagnosePremiumDrop() {
  console.log('🔍 DIAGNÓSTICO: REDUÇÃO DE USUÁRIOS PREMIUM\n')
  console.log('=' .repeat(60))

  try {
    // 1. Contagem atual
    const currentPremiumCount = await countPremiumUsers()
    const validationCount = await validatePremiumCount()
    
    console.log(`\n📊 CONTAGEM ATUAL:`)
    console.log(`   Premium (função): ${currentPremiumCount}`)
    console.log(`   Premium (query): ${validationCount}`)
    console.log(`   Diferença: ${Math.abs(currentPremiumCount - validationCount)}`)

    // 2. Assinaturas que expiraram nos últimos 7 dias
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const expiredLastWeek = await prisma.subscription.findMany({
      where: {
        currentPeriodEnd: {
          gte: sevenDaysAgo,
          lt: new Date()
        },
        status: {
          in: [...PRISMA_PREMIUM_LIKE_STATUSES]
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        currentPeriodEnd: 'desc'
      }
    })

    console.log(`\n⏰ ASSINATURAS (status ativo/trial etc.) QUE EXPIRARAM NOS ÚLTIMOS 7 DIAS: ${expiredLastWeek.length}`)
    if (expiredLastWeek.length > 0) {
      expiredLastWeek.forEach((sub, index) => {
        console.log(`\n${index + 1}. Usuário: ${sub.user.email} (${sub.user.name || 'Sem nome'})`)
        console.log(`   Plano: ${sub.plan.name}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Expirou em: ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`   Subscription ID: ${sub.id}`)
        console.log(`   Stripe ID: ${sub.stripeSubscriptionId}`)
      })
    }

    // 3. Assinaturas canceladas nos últimos 7 dias
    const canceledLastWeek = await prisma.subscription.findMany({
      where: {
        status: 'canceled',
        updatedAt: {
          gte: sevenDaysAgo
        }
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

    console.log(`\n🚫 ASSINATURAS CANCELADAS NOS ÚLTIMOS 7 DIAS: ${canceledLastWeek.length}`)
    if (canceledLastWeek.length > 0) {
      canceledLastWeek.forEach((sub, index) => {
        console.log(`\n${index + 1}. Usuário: ${sub.user.email} (${sub.user.name || 'Sem nome'})`)
        console.log(`   Plano: ${sub.plan.name}`)
        console.log(`   Cancelado em: ${sub.updatedAt.toISOString()}`)
        console.log(`   Expirava em: ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`   Subscription ID: ${sub.id}`)
        console.log(`   Stripe ID: ${sub.stripeSubscriptionId}`)
      })
    }

    // 4. Assinaturas expiradas mas ainda marcadas como ativas
    const expiredButActive = await prisma.subscription.findMany({
      where: {
        status: {
          in: [...PRISMA_PREMIUM_LIKE_STATUSES]
        },
        currentPeriodEnd: {
          lt: new Date()
        }
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
        currentPeriodEnd: 'desc'
      }
    })

    console.log(`\n⚠️  ASSINATURAS EXPIRADAS MAS AINDA MARCADAS COMO ATIVAS: ${expiredButActive.length}`)
    if (expiredButActive.length > 0) {
      console.log(`\n⚠️  PROBLEMA CRÍTICO: Estas assinaturas estão inflando a contagem de premium!`)
      expiredButActive.forEach((sub, index) => {
        const daysExpired = Math.floor((new Date().getTime() - sub.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`\n${index + 1}. Usuário: ${sub.user.email} (${sub.user.name || 'Sem nome'})`)
        console.log(`   Plano: ${sub.plan.name}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Expirou há: ${daysExpired} dias`)
        console.log(`   Expirou em: ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`   Subscription ID: ${sub.id}`)
        console.log(`   Stripe ID: ${sub.stripeSubscriptionId}`)
      })
    }

    // 5. Assinaturas que foram atualizadas nos últimos 7 dias
    const updatedLastWeek = await prisma.subscription.findMany({
      where: {
        updatedAt: {
          gte: sevenDaysAgo
        }
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
      },
      take: 20 // Limitar para não sobrecarregar
    })

    console.log(`\n🔄 ASSINATURAS ATUALIZADAS NOS ÚLTIMOS 7 DIAS (últimas 20): ${updatedLastWeek.length}`)
    if (updatedLastWeek.length > 0) {
      updatedLastWeek.forEach((sub, index) => {
        const isExpired = sub.currentPeriodEnd < new Date()
        const isActive = subscriptionGrantsPremiumAccess(sub)
        console.log(`\n${index + 1}. Usuário: ${sub.user.email}`)
        console.log(`   Plano: ${sub.plan.name}`)
        console.log(`   Status: ${sub.status} ${isActive ? '✅ ATIVA' : '❌ INATIVA'}`)
        console.log(`   Atualizado em: ${sub.updatedAt.toISOString()}`)
        console.log(`   Expira em: ${sub.currentPeriodEnd.toISOString()} ${isExpired ? '⚠️ EXPIRADA' : ''}`)
      })
    }

    // 6. Verificar se há problemas com webhooks (assinaturas sem atualização recente mas que deveriam estar ativas)
    const shouldBeActiveButNotUpdated = await prisma.subscription.findMany({
      where: {
        ...prismaWhereSubscriptionGrantsPremium(),
        updatedAt: {
          lt: sevenDaysAgo
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      take: 10
    })

    console.log(`\n🔔 ASSINATURAS ATIVAS MAS SEM ATUALIZAÇÃO RECENTE (últimas 10): ${shouldBeActiveButNotUpdated.length}`)
    if (shouldBeActiveButNotUpdated.length > 0) {
      console.log(`   (Possível problema com webhooks - não foram atualizadas recentemente)`)
      shouldBeActiveButNotUpdated.forEach((sub, index) => {
        const daysSinceUpdate = Math.floor((new Date().getTime() - sub.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`\n${index + 1}. Usuário: ${sub.user.email}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Última atualização: há ${daysSinceUpdate} dias`)
        console.log(`   Expira em: ${sub.currentPeriodEnd.toISOString()}`)
      })
    }

    // 7. Resumo e análise
    console.log(`\n📋 RESUMO E ANÁLISE:`)
    console.log(`   Total premium atual: ${currentPremiumCount}`)
    console.log(`   Assinaturas expiradas na última semana: ${expiredLastWeek.length}`)
    console.log(`   Assinaturas canceladas na última semana: ${canceledLastWeek.length}`)
    console.log(`   Assinaturas expiradas mas ainda ativas: ${expiredButActive.length}`)
    
    const totalLost = expiredLastWeek.length + canceledLastWeek.length
    console.log(`\n   💡 POSSÍVEL CAUSA DA REDUÇÃO:`)
    if (expiredButActive.length > 0) {
      console.log(`   ⚠️  ${expiredButActive.length} assinaturas expiradas ainda contam como premium`)
      console.log(`      Isso pode estar inflando a contagem anterior!`)
    }
    if (totalLost > 0) {
      console.log(`   📉 ${totalLost} assinaturas perderam status premium (${expiredLastWeek.length} expiradas + ${canceledLastWeek.length} canceladas)`)
    }
    if (totalLost === 0 && expiredButActive.length === 0) {
      console.log(`   ✅ Não encontrei causas óbvias na última semana`)
      console.log(`   💡 Pode ser necessário verificar logs de webhooks ou histórico mais antigo`)
    }

    // 8. Recomendações
    console.log(`\n💡 RECOMENDAÇÕES:`)
    if (expiredButActive.length > 0) {
      console.log(`   1. ⚠️  CORRIGIR: Executar script fix-expired-subscriptions.ts`)
      console.log(`      Isso corrigirá ${expiredButActive.length} assinaturas expiradas`)
    }
    if (expiredLastWeek.length > 0) {
      console.log(`   2. 📅 Verificar se webhooks estão processando renovações corretamente`)
      console.log(`      ${expiredLastWeek.length} assinaturas expiraram e podem precisar renovação`)
    }
    if (canceledLastWeek.length > 0) {
      console.log(`   3. 🚫 Verificar motivo dos cancelamentos`)
      console.log(`      ${canceledLastWeek.length} assinaturas foram canceladas`)
    }
    console.log(`   4. 🔍 Verificar logs de webhooks (Stripe/Hotmart) para erros`)
    console.log(`   5. 📊 Comparar com métricas de uma semana atrás se disponível`)

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnosePremiumDrop()

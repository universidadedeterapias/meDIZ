// src/scripts/check-webhook-health.ts
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

async function checkWebhookHealth() {
  console.log('🔍 VERIFICAÇÃO DE SAÚDE DOS WEBHOOKS\n')
  console.log('=' .repeat(60))

  try {
    // 1. Assinaturas que expiraram mas não foram atualizadas recentemente
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const expiredNotUpdated = await prisma.subscription.findMany({
      where: {
        currentPeriodEnd: {
          lt: new Date(),
          gte: sevenDaysAgo // Expiraram nos últimos 7 dias
        },
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        updatedAt: {
          lt: sevenDaysAgo // Não foram atualizadas nos últimos 7 dias
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

    console.log(`\n⚠️  ASSINATURAS EXPIRADAS SEM ATUALIZAÇÃO DE WEBHOOK:`)
    console.log(`   Total: ${expiredNotUpdated.length}`)
    
    if (expiredNotUpdated.length > 0) {
      console.log(`\n   💡 Estas assinaturas expiraram mas não receberam webhook de atualização:`)
      expiredNotUpdated.slice(0, 10).forEach((sub, index) => {
        const daysSinceExpiry = Math.floor((new Date().getTime() - sub.currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24))
        const daysSinceUpdate = Math.floor((new Date().getTime() - sub.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
        const isHotmart = sub.stripeSubscriptionId?.startsWith('hotmart_')
        const isStripe = sub.stripeSubscriptionId?.startsWith('sub_')
        const isAdmin = sub.stripeSubscriptionId?.startsWith('sub_admin_')
        
        console.log(`\n   ${index + 1}. ${sub.user.email}`)
        console.log(`      Status: ${sub.status}`)
        console.log(`      Expirou há: ${daysSinceExpiry} dias`)
        console.log(`      Última atualização: há ${daysSinceUpdate} dias`)
        console.log(`      Provedor: ${isHotmart ? 'Hotmart' : isStripe ? 'Stripe' : isAdmin ? 'Admin' : 'Desconhecido'}`)
        console.log(`      Subscription ID: ${sub.stripeSubscriptionId}`)
      })
      
      if (expiredNotUpdated.length > 10) {
        console.log(`\n   ... e mais ${expiredNotUpdated.length - 10} assinaturas`)
      }
    }

    // 2. Assinaturas que deveriam ter sido renovadas mas não foram
    const shouldHaveRenewed = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          lt: new Date() // Já expiraram
        },
        updatedAt: {
          lt: sevenDaysAgo // Não foram atualizadas recentemente
        }
      },
      include: {
        user: {
          select: {
            email: true
          }
        }
      },
      take: 20
    })

    console.log(`\n\n🔄 ASSINATURAS QUE DEVERIAM TER SIDO RENOVADAS:`)
    console.log(`   Total encontradas: ${shouldHaveRenewed.length}`)
    
    if (shouldHaveRenewed.length > 0) {
      const hotmartCount = shouldHaveRenewed.filter(s => s.stripeSubscriptionId?.startsWith('hotmart_')).length
      const stripeCount = shouldHaveRenewed.filter(s => s.stripeSubscriptionId?.startsWith('sub_') && !s.stripeSubscriptionId.startsWith('sub_admin_')).length
      const adminCount = shouldHaveRenewed.filter(s => s.stripeSubscriptionId?.startsWith('sub_admin_')).length
      
      console.log(`   - Hotmart: ${hotmartCount}`)
      console.log(`   - Stripe: ${stripeCount}`)
      console.log(`   - Admin: ${adminCount}`)
      
      console.log(`\n   💡 Possíveis causas:`)
      console.log(`   1. Webhook não foi enviado pelo provedor`)
      console.log(`   2. Webhook falhou ao processar`)
      console.log(`   3. Assinatura realmente não foi renovada (pagamento falhou)`)
      console.log(`   4. Assinatura foi cancelada mas status não foi atualizado`)
    }

    // 3. Verificar assinaturas Stripe diretamente (se possível)
    if (stripe) {
      console.log(`\n\n🔍 VERIFICANDO ASSINATURAS STRIPE DIRETAMENTE:`)
      
      const stripeSubscriptions = await prisma.subscription.findMany({
        where: {
          stripeSubscriptionId: {
            startsWith: 'sub_'
          },
          NOT: {
            stripeSubscriptionId: {
              startsWith: 'sub_admin_'
            }
          },
          status: {
            in: ['active', 'ACTIVE', 'cancel_at_period_end']
          }
        },
        take: 5 // Limitar para não fazer muitas chamadas
      })

      console.log(`   Verificando ${stripeSubscriptions.length} assinaturas Stripe...`)
      
      let mismatches = 0
      for (const dbSub of stripeSubscriptions) {
        try {
          const stripeSub = await stripe.subscriptions.retrieve(dbSub.stripeSubscriptionId)
          // Stripe SDK v18+: current_period_end está em items.data[0], não no objeto subscription
          const periodEndTimestamp =
            stripeSub.items?.data?.[0]?.current_period_end ??
            (stripeSub as unknown as { current_period_end?: number }).current_period_end
          const stripeStatus = stripeSub.status
          const stripePeriodEnd = periodEndTimestamp
            ? new Date(periodEndTimestamp * 1000)
            : null
          const dbPeriodEnd = dbSub.currentPeriodEnd
          
          const statusMatch = (
            (stripeStatus === 'active' && dbSub.status === 'active') ||
            (stripeStatus === 'canceled' && dbSub.status === 'canceled') ||
            (stripeStatus === 'past_due' && dbSub.status === 'past_due') ||
            (stripeStatus === 'unpaid' && dbSub.status === 'unpaid')
          )
          
          const periodMatch = stripePeriodEnd
            ? Math.abs(stripePeriodEnd.getTime() - dbPeriodEnd.getTime()) < 60000 // 1 minuto de diferença
            : false
          
          if (!statusMatch || !periodMatch) {
            mismatches++
            console.log(`\n   ⚠️  DESENCONTRO ENCONTRADO:`)
            console.log(`      Subscription ID: ${dbSub.stripeSubscriptionId}`)
            console.log(`      Status no DB: ${dbSub.status}`)
            console.log(`      Status no Stripe: ${stripeStatus}`)
            console.log(`      Período no DB: ${dbPeriodEnd.toISOString()}`)
            console.log(`      Período no Stripe: ${stripePeriodEnd ? stripePeriodEnd.toISOString() : 'N/A'}`)
          }
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            console.log(`\n   ⚠️  Assinatura não encontrada no Stripe: ${dbSub.stripeSubscriptionId}`)
            console.log(`      Isso pode indicar que foi deletada mas não atualizada no DB`)
          } else {
            console.log(`\n   ❌ Erro ao verificar ${dbSub.stripeSubscriptionId}: ${error.message}`)
          }
        }
      }
      
      if (mismatches === 0 && stripeSubscriptions.length > 0) {
        console.log(`   ✅ Todas as assinaturas verificadas estão sincronizadas`)
      }
    } else {
      console.log(`\n   ⚠️  STRIPE_SECRET_KEY não configurada - pulando verificação direta`)
    }

    // 4. Estatísticas de atualizações recentes
    const recentUpdates = await prisma.subscription.groupBy({
      by: ['status'],
      where: {
        updatedAt: {
          gte: sevenDaysAgo
        }
      },
      _count: {
        id: true
      }
    })

    console.log(`\n\n📊 ESTATÍSTICAS DE ATUALIZAÇÕES (últimos 7 dias):`)
    recentUpdates.forEach(stat => {
      console.log(`   ${stat.status}: ${stat._count.id} assinaturas atualizadas`)
    })

    // 5. Assinaturas que nunca foram atualizadas após criação
    // Buscar assinaturas criadas há mais de 7 dias e que expiraram
    const oldSubscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo // Criadas há mais de 7 dias
        },
        status: {
          in: ['active', 'ACTIVE']
        },
        currentPeriodEnd: {
          lt: new Date() // E já expiraram
        }
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        currentPeriodEnd: true,
        stripeSubscriptionId: true,
        user: {
          select: {
            email: true
          }
        }
      }
    })
    
    // Filtrar manualmente as que nunca foram atualizadas (createdAt === updatedAt)
    const neverUpdated = oldSubscriptions.filter(sub => {
      const createdAtTime = sub.createdAt.getTime()
      const updatedAtTime = sub.updatedAt.getTime()
      // Considerar como "nunca atualizada" se a diferença for menor que 1 segundo
      return Math.abs(createdAtTime - updatedAtTime) < 1000
    })

    console.log(`\n\n🚨 ASSINATURAS QUE NUNCA FORAM ATUALIZADAS:`)
    console.log(`   Total: ${neverUpdated.length}`)
    
    if (neverUpdated.length > 0) {
      console.log(`   💡 Estas assinaturas foram criadas mas nunca receberam atualização via webhook:`)
      neverUpdated.slice(0, 10).forEach((sub, index) => {
        const daysSinceCreation = Math.floor((new Date().getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`\n   ${index + 1}. ${sub.user.email}`)
        console.log(`      Criada há: ${daysSinceCreation} dias`)
        console.log(`      Expirou em: ${sub.currentPeriodEnd.toISOString()}`)
        console.log(`      Subscription ID: ${sub.stripeSubscriptionId}`)
      })
      
      if (neverUpdated.length > 10) {
        console.log(`\n   ... e mais ${neverUpdated.length - 10} assinaturas`)
      }
    }

    // 6. Resumo e recomendações
    console.log(`\n\n📋 RESUMO E RECOMENDAÇÕES:`)
    console.log(`   Assinaturas expiradas sem atualização: ${expiredNotUpdated.length}`)
    console.log(`   Assinaturas que deveriam ter sido renovadas: ${shouldHaveRenewed.length}`)
    console.log(`   Assinaturas nunca atualizadas: ${neverUpdated.length}`)
    
    console.log(`\n   💡 AÇÕES RECOMENDADAS:`)
    
    if (expiredNotUpdated.length > 0 || shouldHaveRenewed.length > 0) {
      console.log(`   1. ⚠️  Verificar logs de webhooks no Stripe Dashboard`)
      console.log(`      - Acesse: https://dashboard.stripe.com/webhooks`)
      console.log(`      - Verifique eventos recentes de subscription.updated`)
      console.log(`      - Verifique se há erros 4xx ou 5xx`)
      
      console.log(`\n   2. ⚠️  Verificar logs de webhooks da Hotmart`)
      console.log(`      - Acesse o painel da Hotmart`)
      console.log(`      - Verifique se webhooks estão sendo enviados`)
      console.log(`      - Verifique se há erros de entrega`)
      
      console.log(`\n   3. 🔍 Verificar logs do servidor`)
      console.log(`      - Procure por "[STRIPE WEBHOOK]" ou "[hotmart]" nos logs`)
      console.log(`      - Verifique se há erros de processamento`)
      console.log(`      - Verifique se webhooks estão chegando`)
      
      console.log(`\n   4. 🔧 Executar correção manual se necessário`)
      console.log(`      - Para assinaturas realmente expiradas: npm run fix-expired-subs`)
      console.log(`      - Para verificar status no Stripe: usar API do Stripe`)
    }
    
    if (neverUpdated.length > 0) {
      console.log(`\n   5. ⚠️  Investigar assinaturas nunca atualizadas`)
      console.log(`      - Pode indicar problema na configuração inicial do webhook`)
      console.log(`      - Verificar se webhook endpoint está correto`)
    }

    console.log(`\n   6. 📊 Monitorar regularmente`)
    console.log(`      - Executar este script semanalmente`)
    console.log(`      - Configurar alertas para webhooks falhando`)
    console.log(`      - Verificar métricas de renovação`)

  } catch (error) {
    console.error('❌ Erro na verificação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkWebhookHealth()

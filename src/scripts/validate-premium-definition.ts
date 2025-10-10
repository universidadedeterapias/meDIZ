// src/scripts/validate-premium-definition.ts
import { prisma } from '@/lib/prisma'
import { countPremiumUsers, validatePremiumCount, PREMIUM_VALIDATION_QUERY } from '@/lib/premiumUtils'

async function main() {
  console.log('🔍 VALIDAÇÃO DA DEFINIÇÃO DE PREMIUM\n')

  try {
    // 1. Contagem usando função utilitária
    const premiumCount = await countPremiumUsers()
    console.log(`📊 Usuários premium (função): ${premiumCount}`)

    // 2. Contagem usando query de conferência
    const validationCount = await validatePremiumCount()
    console.log(`📊 Usuários premium (query): ${validationCount}`)

    // 3. Verificação de consistência
    const isConsistent = premiumCount === validationCount
    console.log(`✅ Consistência: ${isConsistent ? 'SIM' : 'NÃO'}`)

    if (!isConsistent) {
      console.log(`⚠️  Diferença: ${Math.abs(premiumCount - validationCount)} usuários`)
    }

    // 4. Query manual para debug
    console.log('\n🔍 QUERY DE CONFERÊNCIA:')
    console.log(PREMIUM_VALIDATION_QUERY)

    // 5. Detalhes dos usuários premium
    console.log('\n📋 USUÁRIOS PREMIUM DETALHADOS:')
    
    const premiumUsers = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          include: {
            plan: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    premiumUsers.forEach((user: { name: string | null; email: string; subscriptions: Array<{ plan: { name: string }; status: string; currentPeriodStart: Date; currentPeriodEnd: Date }> }, index: number) => {
      console.log(`\n${index + 1}. ${user.name || 'Sem nome'} (${user.email})`)
      user.subscriptions.forEach((sub: { plan: { name: string }; status: string; currentPeriodStart: Date; currentPeriodEnd: Date }, subIndex: number) => {
        console.log(`   📅 Subscription ${subIndex + 1}:`)
        console.log(`      Plano: ${sub.plan.name}`)
        console.log(`      Status: ${sub.status}`)
        console.log(`      Período: ${sub.currentPeriodStart.toLocaleDateString('pt-BR')} - ${sub.currentPeriodEnd.toLocaleDateString('pt-BR')}`)
        console.log(`      Válida: ${sub.currentPeriodEnd >= new Date() ? '✅ SIM' : '❌ NÃO'}`)
      })
    })

    // 6. Usuários que NÃO são premium (para comparação)
    console.log('\n📋 USUÁRIOS NÃO PREMIUM (amostra):')
    
    const nonPremiumUsers = await prisma.user.findMany({
      where: {
        subscriptions: {
          none: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subscriptions: {
          select: {
            status: true,
            currentPeriodEnd: true
          }
        }
      }
    })

    nonPremiumUsers.forEach((user: { name: string | null; email: string; createdAt: Date; subscriptions: Array<{ status: string; currentPeriodEnd: Date }> }, index: number) => {
      console.log(`\n${index + 1}. ${user.name || 'Sem nome'} (${user.email})`)
      console.log(`   📅 Criado em: ${user.createdAt.toLocaleDateString('pt-BR')}`)
      console.log(`   💳 Subscriptions: ${user.subscriptions.length}`)
      if (user.subscriptions.length > 0) {
        user.subscriptions.forEach((sub: { status: string; currentPeriodEnd: Date }, subIndex: number) => {
          console.log(`      ${subIndex + 1}. Status: ${sub.status}, Vence: ${sub.currentPeriodEnd.toLocaleDateString('pt-BR')}`)
        })
      }
    })

    // 7. Resumo final
    const totalUsers = await prisma.user.count()
    console.log(`\n📊 RESUMO FINAL:`)
    console.log(`✅ Total de usuários: ${totalUsers}`)
    console.log(`💳 Usuários premium: ${premiumCount}`)
    console.log(`🆓 Usuários gratuitos: ${totalUsers - premiumCount}`)
    console.log(`📈 Taxa de conversão: ${totalUsers > 0 ? ((premiumCount / totalUsers) * 100).toFixed(2) : '0'}%`)

  } catch (error) {
    console.error('❌ Erro na validação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

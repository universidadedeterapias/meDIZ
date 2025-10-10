// src/app/api/admin/analytics/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { countPremiumUsers, validatePremiumCount } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const timeRange = searchParams.get('range') || '7d'

    // Calcula as datas baseado no range
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // 1. Estatísticas gerais usando fonte de verdade
    const totalUsers = await prisma.user.count()
    const usersWithActiveSubscriptions = await countPremiumUsers()
    const freeUsers = totalUsers - usersWithActiveSubscriptions

    // Validação cruzada com query de conferência
    const validationCount = await validatePremiumCount()
    console.log(`[Analytics] Premium users - API: ${usersWithActiveSubscriptions}, Validation: ${validationCount}`)

    // 2. Conversões no período
    const conversionsInPeriod = await prisma.subscription.count({
      where: {
        createdAt: {
          gte: startDate
        },
        status: {
          in: ['active', 'ACTIVE']
        }
      }
    })

    // 3. Usuários por período de cadastro
    const allUsers = await prisma.user.findMany({
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
      select: {
        createdAt: true
      }
    })

    const firstWeekUsers = allUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation <= 7
    })

    const firstMonthUsers = allUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation > 7 && daysSinceCreation <= 30
    })

    const beyondMonthUsers = allUsers.filter(user => {
      const daysSinceCreation = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceCreation > 30
    })

    // 4. Conversões por período de usuário
    const conversionsByPeriod = await Promise.all([
      // Conversões de usuários 1-7 dias
      prisma.subscription.count({
        where: {
          createdAt: {
            gte: startDate
          },
          status: {
            in: ['active', 'ACTIVE']
          },
          user: {
            createdAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      }),
      // Conversões de usuários 8-30 dias
      prisma.subscription.count({
        where: {
          createdAt: {
            gte: startDate
          },
          status: {
            in: ['active', 'ACTIVE']
          },
          user: {
            createdAt: {
              gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      }),
      // Conversões de usuários 31+ dias
      prisma.subscription.count({
        where: {
          createdAt: {
            gte: startDate
          },
          status: {
            in: ['active', 'ACTIVE']
          },
          user: {
            createdAt: {
              lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }
      })
    ])

    // 5. Dados diários para gráfico
    const dailyData = []
    const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const dailyConversions = await prisma.subscription.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          },
          status: {
            in: ['active', 'ACTIVE']
          }
        }
      })

      const dailyUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      })

      dailyData.push({
        date: dayStart.toISOString().split('T')[0],
        conversions: dailyConversions,
        newUsers: dailyUsers,
        conversionRate: dailyUsers > 0 ? (dailyConversions / dailyUsers) * 100 : 0
      })
    }

    // 6. Taxa de conversão global
    const globalConversionRate = freeUsers > 0 ? (usersWithActiveSubscriptions / totalUsers) * 100 : 0

    // 7. Valor médio de assinatura (simulado - seria necessário dados reais de preço)
    const averageSubscriptionValue = 39.90

    // 8. Dados por período para tabela
    const periodData = [
      {
        period: 'first-week',
        name: '1-7 dias',
        total: firstWeekUsers.length,
        conversions: conversionsByPeriod[0],
        rate: firstWeekUsers.length > 0 ? (conversionsByPeriod[0] / firstWeekUsers.length) * 100 : 0
      },
      {
        period: 'first-month',
        name: '8-30 dias',
        total: firstMonthUsers.length,
        conversions: conversionsByPeriod[1],
        rate: firstMonthUsers.length > 0 ? (conversionsByPeriod[1] / firstMonthUsers.length) * 100 : 0
      },
      {
        period: 'beyond-month',
        name: '31+ dias',
        total: beyondMonthUsers.length,
        conversions: conversionsByPeriod[2],
        rate: beyondMonthUsers.length > 0 ? (conversionsByPeriod[2] / beyondMonthUsers.length) * 100 : 0
      }
    ]

    return NextResponse.json({
      stats: {
        totalUsers,
        premiumUsers: usersWithActiveSubscriptions,
        freeUsers,
        globalConversionRate: Number(globalConversionRate.toFixed(2)),
        totalConversions: conversionsInPeriod,
        averageSubscriptionValue
      },
      dailyData,
      periodData,
      timeRange
    })

  } catch (error) {
    console.error('Erro ao buscar analytics:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

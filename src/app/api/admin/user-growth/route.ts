// src/app/api/admin/user-growth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

interface WeeklyGrowth {
  week: string
  weekStart: string
  weekEnd: string
  totalUsers: number
  newUsers: number
  premiumUsers: number
  freeUsers: number
  conversions: number
  growthRate: number
  conversionRate: number
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const daysParam = searchParams.get('days') || '30' // Padrão 30 dias
    const days = parseInt(daysParam)
    
    // Validar período permitido
    const allowedDays = [7, 15, 30, 60, 90]
    const validDays = allowedDays.includes(days) ? days : 30

    console.log(`[User Growth API] Calculando crescimento para ${validDays} dias`)

    // Calcular data inicial baseada em dias
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - validDays)
    startDate.setHours(0, 0, 0, 0)

    // Calcular dados semanais para o período
    const dailyData: WeeklyGrowth[] = []
    
    // Processar dados
    if (validDays === 7) {
      // Para 7 dias, processar cada dia individualmente (7 pontos diários)
      for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const dayEnd = new Date(now)
        dayEnd.setDate(now.getDate() - dayOffset)
        dayEnd.setHours(23, 59, 59, 999)
        
        const dayStart = new Date(dayEnd)
        dayStart.setHours(0, 0, 0, 0)
        
        // Não processar dias futuros
        if (dayStart > now) continue
        
        // Total de usuários até o final do dia
        const totalUsers = await prisma.user.count({
          where: {
            createdAt: {
              lte: dayEnd
            }
          }
        })

        // Novos usuários no dia
        const newUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: dayStart,
              lte: dayEnd
            }
          }
        })

        // Usuários premium até o final do dia
        const premiumUsersAtDay = await prisma.user.count({
          where: {
            createdAt: {
              lte: dayEnd
            },
            subscriptions: {
              some: {
                createdAt: {
                  lte: dayEnd
                },
                status: {
                  in: ['active', 'ACTIVE', 'cancel_at_period_end']
                },
                currentPeriodStart: {
                  lte: dayEnd
                },
                currentPeriodEnd: {
                  gte: dayEnd
                }
              }
            }
          }
        })

        // Usuários gratuitos até o final do dia
        const freeUsers = totalUsers - premiumUsersAtDay

        // Conversões no dia (novas assinaturas criadas)
        const conversions = await prisma.subscription.count({
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

        // Calcular taxa de crescimento (comparar com dia anterior)
        const previousDayStart = new Date(dayStart)
        previousDayStart.setDate(dayStart.getDate() - 1)
        
        const previousDayTotal = await prisma.user.count({
          where: {
            createdAt: {
              lte: previousDayStart
            }
          }
        })

        const growthRate = previousDayTotal > 0 
          ? ((totalUsers - previousDayTotal) / previousDayTotal) * 100 
          : 0

        // Calcular taxa de conversão
        const conversionRate = newUsers > 0 ? (conversions / newUsers) * 100 : 0

        const dayLabel = dayStart.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })

        dailyData.push({
          week: dayLabel,
          weekStart: dayStart.toISOString(),
          weekEnd: dayEnd.toISOString(),
          totalUsers,
          newUsers,
          premiumUsers: premiumUsersAtDay,
          freeUsers,
          conversions,
          growthRate: Math.round(growthRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100
        })
      }
    } else {
      // Para outros períodos, usar semanas completas
      const weeksToProcess = Math.ceil(validDays / 7)
      
      for (let i = weeksToProcess - 1; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - (now.getDay() + 7 * i)) // Domingo da semana
        weekStart.setHours(0, 0, 0, 0)
        
        // Se a semana começa antes do período, ajustar
        if (weekStart < startDate) {
          weekStart.setTime(startDate.getTime())
        }

        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6) // Sábado da semana
        weekEnd.setHours(23, 59, 59, 999)
        
        // Não processar semanas futuras
        if (weekStart > now) continue

        // Total de usuários até o final da semana
        const totalUsers = await prisma.user.count({
          where: {
            createdAt: {
              lte: weekEnd
            }
          }
        })

        // Novos usuários na semana
        const newUsers = await prisma.user.count({
          where: {
            createdAt: {
              gte: weekStart,
              lte: weekEnd
            }
          }
        })

        // Usuários premium até o final da semana
        // Buscar usuários que tinham assinatura ativa naquela data específica
        const premiumUsersAtWeek = await prisma.user.count({
          where: {
            createdAt: {
              lte: weekEnd
            },
            subscriptions: {
              some: {
                createdAt: {
                  lte: weekEnd
                },
                status: {
                  in: ['active', 'ACTIVE', 'cancel_at_period_end']
                },
                currentPeriodStart: {
                  lte: weekEnd
                },
                currentPeriodEnd: {
                  gte: weekEnd
                }
              }
            }
          }
        })

        // Usuários gratuitos até o final da semana
        const freeUsers = totalUsers - premiumUsersAtWeek

        // Conversões na semana (novas assinaturas criadas)
        const conversions = await prisma.subscription.count({
          where: {
            createdAt: {
              gte: weekStart,
              lte: weekEnd
            },
            status: {
              in: ['active', 'ACTIVE']
            }
          }
        })

        // Calcular taxa de crescimento
        const previousWeekStart = new Date(weekStart)
        previousWeekStart.setDate(weekStart.getDate() - 7)
        
        const previousWeekTotal = await prisma.user.count({
          where: {
            createdAt: {
              lte: previousWeekStart
            }
          }
        })

        const growthRate = previousWeekTotal > 0 
          ? ((totalUsers - previousWeekTotal) / previousWeekTotal) * 100 
          : 0

        // Calcular taxa de conversão
        const conversionRate = newUsers > 0 ? (conversions / newUsers) * 100 : 0

        const weekLabel = weekStart.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }) + 
                         ' - ' + 
                         weekEnd.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })

        dailyData.push({
          week: weekLabel,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          totalUsers,
          newUsers,
          premiumUsers: premiumUsersAtWeek,
          freeUsers,
          conversions,
          growthRate: Math.round(growthRate * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100
        })
      }
    }
    
    // Total atual de premium e free
    const totalPremium = await prisma.user.count({
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
      }
    })
    
    const totalUsersNow = await prisma.user.count()
    const totalFree = totalUsersNow - totalPremium

    // Calcular comparação com semana anterior
    const currentWeek = dailyData[dailyData.length - 1]
    const previousWeek = dailyData[dailyData.length - 2]

    const comparison = {
      usersGrowth: previousWeek ? currentWeek.totalUsers - previousWeek.totalUsers : 0,
      usersGrowthRate: previousWeek ? currentWeek.growthRate - previousWeek.growthRate : 0,
      conversionsGrowth: previousWeek ? currentWeek.conversions - previousWeek.conversions : 0,
      conversionsGrowthRate: previousWeek ? currentWeek.conversionRate - previousWeek.conversionRate : 0
    }

    console.log(`[User Growth API] Dados calculados: ${dailyData.length} ${validDays === 7 ? 'dias' : 'semanas'}`)

    return NextResponse.json({
      success: true,
      data: dailyData,
      current: {
        totalUsers: totalUsersNow,
        premiumUsers: totalPremium,
        freeUsers: totalFree
      },
      comparison,
      summary: {
        totalWeeks: dailyData.length,
        averageGrowthRate: dailyData.length > 0 
          ? dailyData.reduce((sum, week) => sum + week.growthRate, 0) / dailyData.length 
          : 0,
        averageConversionRate: dailyData.length > 0
          ? dailyData.reduce((sum, week) => sum + week.conversionRate, 0) / dailyData.length
          : 0,
        totalNewUsers: dailyData.reduce((sum, week) => sum + week.newUsers, 0),
        totalConversions: dailyData.reduce((sum, week) => sum + week.conversions, 0)
      }
    })

  } catch (error) {
    console.error('[User Growth API] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

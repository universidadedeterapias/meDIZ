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
    const weeks = parseInt(searchParams.get('weeks') || '12') // Últimas 12 semanas por padrão

    console.log(`[User Growth API] Calculando crescimento para ${weeks} semanas`)

    // Calcular datas das últimas N semanas
    const now = new Date()
    const weeklyData: WeeklyGrowth[] = []

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (now.getDay() + 7 * i)) // Domingo da semana
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6) // Sábado da semana
      weekEnd.setHours(23, 59, 59, 999)

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

      // Conversões na semana (usuários que se tornaram premium)
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

      weeklyData.push({
        week: `Semana ${weeks - i}`,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        totalUsers,
        newUsers,
        conversions,
        growthRate: Math.round(growthRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100
      })
    }

    // Calcular comparação com semana anterior
    const currentWeek = weeklyData[weeklyData.length - 1]
    const previousWeek = weeklyData[weeklyData.length - 2]

    const comparison = {
      usersGrowth: previousWeek ? currentWeek.totalUsers - previousWeek.totalUsers : 0,
      usersGrowthRate: previousWeek ? currentWeek.growthRate - previousWeek.growthRate : 0,
      conversionsGrowth: previousWeek ? currentWeek.conversions - previousWeek.conversions : 0,
      conversionsGrowthRate: previousWeek ? currentWeek.conversionRate - previousWeek.conversionRate : 0
    }

    console.log(`[User Growth API] Dados calculados: ${weeklyData.length} semanas`)

    return NextResponse.json({
      success: true,
      data: weeklyData,
      comparison,
      summary: {
        totalWeeks: weeklyData.length,
        averageGrowthRate: weeklyData.reduce((sum, week) => sum + week.growthRate, 0) / weeklyData.length,
        averageConversionRate: weeklyData.reduce((sum, week) => sum + week.conversionRate, 0) / weeklyData.length,
        totalNewUsers: weeklyData.reduce((sum, week) => sum + week.newUsers, 0),
        totalConversions: weeklyData.reduce((sum, week) => sum + week.conversions, 0)
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

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para admins visualizarem todos os lembretes
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é admin
    const isAdmin = session.user.email?.includes('@mediz.com') || false

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem acessar esta página' },
        { status: 403 }
      )
    }

    // Buscar todos os lembretes com informações do usuário
    const reminders = await prisma.reminder.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Converter daysOfWeek de JSON string para array
    const remindersWithParsedDays = reminders.map((reminder) => ({
      ...reminder,
      daysOfWeek: JSON.parse(reminder.daysOfWeek) as number[]
    }))

    // Calcular estatísticas
    const totalReminders = reminders.length
    const activeReminders = reminders.filter((r) => r.active).length
    const inactiveReminders = totalReminders - activeReminders

    // Contar usuários únicos com lembretes (excluindo lembretes globais)
    const uniqueUserIds = new Set(reminders.filter((r) => r.userId !== null).map((r) => r.userId))
    const totalUsersWithReminders = uniqueUserIds.size

    // Contar lembretes por dia da semana
    const remindersByDay: Record<number, number> = {}
    reminders.forEach((reminder) => {
      const days = JSON.parse(reminder.daysOfWeek) as number[]
      days.forEach((day) => {
        remindersByDay[day] = (remindersByDay[day] || 0) + 1
      })
    })

    return NextResponse.json({
      reminders: remindersWithParsedDays,
      stats: {
        totalReminders,
        activeReminders,
        inactiveReminders,
        totalUsersWithReminders,
        remindersByDay
      }
    })
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lembretes' },
      { status: 500 }
    )
  }
}


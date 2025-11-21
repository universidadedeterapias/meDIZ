// src/app/api/admin/plans/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Listar todos os planos
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Retornar todos os planos Hotmart ativos, ordenados por moeda e intervalo
    const plans = await prisma.plan.findMany({
      where: {
        OR: [
          { stripePriceId: { contains: 'hotmart' } },
          { hotmartOfferKey: { not: null } }
        ],
        active: true
      },
      orderBy: [
        { currency: 'asc' }, // BRL primeiro, depois USD
        { interval: 'asc' }, // Mensal primeiro, depois Anual
        { trialPeriodDays: 'asc' } // Sem trial primeiro
      ]
    })

    return NextResponse.json(plans)

  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

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

    // Retornar APENAS os 2 planos válidos: price_hotmart_mensal e price_hotmart_anual
    const plans = await prisma.plan.findMany({
      where: {
        stripePriceId: {
          in: ['price_hotmart_mensal', 'price_hotmart_anual']
        },
        active: true
      },
      orderBy: {
        interval: 'asc' // Mensal primeiro, depois Anual
      }
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

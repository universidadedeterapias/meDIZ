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

    const plans = await prisma.plan.findMany({
      orderBy: {
        createdAt: 'desc'
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

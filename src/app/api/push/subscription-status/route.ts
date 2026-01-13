import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para verificar se o usuário tem subscription push registrada
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

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      hasSubscription: subscriptions.length > 0,
      count: subscriptions.length
    })
  } catch {
    return NextResponse.json(
      { error: 'Erro ao verificar subscription' },
      { status: 500 }
    )
  }
}


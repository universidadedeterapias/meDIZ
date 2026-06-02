import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se a subscription pertence ao usuário
    const subscription = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription não encontrada' },
        { status: 404 }
      )
    }

    if (subscription.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Remover subscription
    await prisma.pushSubscription.delete({
      where: { endpoint }
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription removida com sucesso'
    })
  } catch (error) {
    console.error('Erro ao remover subscription:', error)
    return NextResponse.json(
      { error: 'Erro ao remover subscription' },
      { status: 500 }
    )
  }
}







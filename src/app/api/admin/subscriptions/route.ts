// src/app/api/admin/subscriptions/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Listar assinaturas de um usuário
export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(subscriptions)

  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar nova assinatura
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, planId, status, currentPeriodStart, currentPeriodEnd } = body

    if (!userId || !planId || !status || !currentPeriodStart || !currentPeriodEnd) {
      return NextResponse.json({ error: 'Campos obrigatórios: userId, planId, status, currentPeriodStart, currentPeriodEnd' }, { status: 400 })
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se o plano existe
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    const subscription = await prisma.subscription.create({
      data: {
        stripeSubscriptionId: `sub_admin_${Date.now()}`,
        status,
        currentPeriodStart: new Date(currentPeriodStart),
        currentPeriodEnd: new Date(currentPeriodEnd),
        user: { connect: { id: userId } },
        plan: { connect: { id: planId } }
      },
      include: {
        plan: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(subscription, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar assinatura existente
export async function PUT(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { id, planId, status, currentPeriodStart, currentPeriodEnd } = body

    if (!id) {
      return NextResponse.json({ error: 'ID da assinatura é obrigatório' }, { status: 400 })
    }

    // Verificar se a assinatura existe
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    })

    if (!existingSubscription) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {}
    if (planId) updateData.planId = planId
    if (status) updateData.status = status
    if (currentPeriodStart) updateData.currentPeriodStart = new Date(currentPeriodStart)
    if (currentPeriodEnd) updateData.currentPeriodEnd = new Date(currentPeriodEnd)

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        plan: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(subscription)

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar assinatura
export async function DELETE(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID da assinatura é obrigatório' }, { status: 400 })
    }

    // Verificar se a assinatura existe
    const existingSubscription = await prisma.subscription.findUnique({
      where: { id }
    })

    if (!existingSubscription) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    await prisma.subscription.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Assinatura deletada com sucesso' })

  } catch (error) {
    console.error('Erro ao deletar assinatura:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
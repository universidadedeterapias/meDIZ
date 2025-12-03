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
            id: true,
            name: true,
            hotmartId: true,
            hotmartOfferKey: true,
            stripePriceId: true,
            interval: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 🔧 CORREÇÃO: Calcular status real baseado na data de expiração
    // e corrigir assinaturas expiradas que ainda estão marcadas como "active"
    const now = new Date()
    const subscriptionsWithCorrectStatus = await Promise.all(
      subscriptions.map(async (sub) => {
        const isExpired = sub.currentPeriodEnd < now
        const shouldBeExpired = isExpired && (sub.status === 'active' || sub.status === 'ACTIVE')
        
        // Se está expirada mas marcada como ativa, corrigir automaticamente
        if (shouldBeExpired) {
          console.log(`[ADMIN SUBSCRIPTIONS] 🔧 Corrigindo assinatura expirada: ${sub.id} (usuário: ${userId})`)
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'expired' }
          })
          return { ...sub, status: 'expired', _corrected: true }
        }
        
        return { ...sub, _corrected: false }
      })
    )

    // 🔧 CORREÇÃO: Cancelar duplicatas - manter apenas a assinatura mais recente ativa
    const activeSubscriptions = subscriptionsWithCorrectStatus.filter(
      sub => (sub.status === 'active' || sub.status === 'ACTIVE') && sub.currentPeriodEnd >= now
    )

    if (activeSubscriptions.length > 1) {
      console.log(`[ADMIN SUBSCRIPTIONS] ⚠️ Usuário ${userId} tem ${activeSubscriptions.length} assinaturas ativas - cancelando duplicatas`)
      
      // Ordenar por data de término (mais recente primeiro) - manter a que expira mais tarde
      // Se empate, usar data de criação (mais recente primeiro)
      activeSubscriptions.sort((a, b) => {
        const endDiff = new Date(b.currentPeriodEnd).getTime() - new Date(a.currentPeriodEnd).getTime()
        if (endDiff !== 0) return endDiff
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      
      // Manter apenas a que expira mais tarde (ou mais recente se empate), cancelar as outras
      const toCancel = activeSubscriptions.slice(1)
      for (const sub of toCancel) {
        console.log(`[ADMIN SUBSCRIPTIONS] 🔧 Cancelando assinatura duplicada: ${sub.id}`)
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'canceled' }
        })
      }
      
      // Atualizar status nas subscriptions retornadas
      subscriptionsWithCorrectStatus.forEach(sub => {
        if (toCancel.some(canceled => canceled.id === sub.id)) {
          sub.status = 'canceled'
          sub._corrected = true
        }
      })
    }

    // Remover campos de debug e adicionar informação do provedor antes de retornar
    const cleanedSubscriptions = subscriptionsWithCorrectStatus.map(({ _corrected, ...sub }) => {
      const plan = sub.plan as { id: string; name: string; hotmartId: number | null; hotmartOfferKey: string | null; stripePriceId: string | null; interval: string | null }
      return {
        ...sub,
        plan: {
          ...plan,
          provider: plan.hotmartId || plan.hotmartOfferKey 
            ? 'Hotmart' 
            : plan.stripePriceId?.startsWith('price_') 
              ? 'Stripe' 
              : null
        }
      }
    })

    return NextResponse.json(cleanedSubscriptions)

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
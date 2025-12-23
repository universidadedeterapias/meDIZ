import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const requestStart = Date.now()
  console.log('[API /stripe/subscription] 🔍 ====== INÍCIO VERIFICAÇÃO ASSINATURA ======')
  
  const session = await auth()
  if (!session?.user?.id) {
    console.log('[API /stripe/subscription] ❌ Não autenticado')
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[API /stripe/subscription] 👤 User ID:', session.user.id)
  }

  // 🔍 DEBUG: Buscar TODAS as assinaturas primeiro para ver o que existe
  const allSubscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      createdAt: true,
      updatedAt: true,
      stripeSubscriptionId: true
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log('[API /stripe/subscription] 📦 Total de assinaturas encontradas:', allSubscriptions.length)
  allSubscriptions.forEach((sub, index) => {
    const now = new Date()
    const isExpired = sub.currentPeriodEnd < now
    console.log(`[API /stripe/subscription] 📦 Assinatura ${index + 1}:`, {
      id: sub.id,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: sub.status,
      statusLowercase: sub.status.toLowerCase(),
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      isExpired,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString()
    })
  })

  // 🔍 DEBUG: Verificar assinaturas ativas com filtro correto
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      userId: session.user.id,
      status: {
        in: ['active', 'ACTIVE', 'cancel_at_period_end']
      },
      currentPeriodEnd: {
        gte: new Date()
      }
    },
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log('[API /stripe/subscription] ✅ Assinaturas ATIVAS encontradas:', activeSubscriptions.length)
  activeSubscriptions.forEach((sub, index) => {
    console.log(`[API /stripe/subscription] ✅ Assinatura Ativa ${index + 1}:`, {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString()
    })
  })

  // 🔧 CORREÇÃO: Buscar apenas assinaturas ATIVAS e VÁLIDAS (mesma lógica de isUserPremium)
  // Isso garante que só retornamos assinaturas que realmente dão acesso premium
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: session.user.id,
      status: {
        in: ['active', 'ACTIVE', 'cancel_at_period_end']
      },
      currentPeriodEnd: {
        gte: new Date()
      }
    },
    select: {
      status: true,
      currentPeriodEnd: true,
      currentPeriodStart: true
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!sub) {
    console.log('[API /stripe/subscription] ⚠️ Nenhuma assinatura ATIVA encontrada - retornando canceled')
    console.log('[API /stripe/subscription] 💡 Isso significa que o usuário é GRATUITO')
    const duration = Date.now() - requestStart
    console.log('[API /stripe/subscription] ⏱️ Tempo total:', duration, 'ms')
    console.log('[API /stripe/subscription] ====== FIM VERIFICAÇÃO ASSINATURA ======')
    return NextResponse.json({
      status: 'canceled',
      currentPeriodEnd: null,
      currentPeriodStart: null
    })
  }

  const now = new Date()
  const isExpired = sub.currentPeriodEnd < now
  const statusLower = sub.status.toLowerCase()
  const isActiveStatus = ['active', 'cancel_at_period_end'].includes(statusLower)
  const isValid = isActiveStatus && !isExpired

  console.log('[API /stripe/subscription] ✅ Assinatura ATIVA encontrada:', {
    status: sub.status,
    statusLowercase: statusLower,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    now: now.toISOString(),
    isExpired,
    isActiveStatus,
    isValid,
    willReturnActive: isValid
  })

  const duration = Date.now() - requestStart
  console.log('[API /stripe/subscription] ⏱️ Tempo total:', duration, 'ms')
  console.log('[API /stripe/subscription] ====== FIM VERIFICAÇÃO ASSINATURA ======')

  return NextResponse.json({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    currentPeriodStart: sub.currentPeriodStart.toISOString()
  })
}

import { auth } from '@/auth'
import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
import { prisma } from '@/lib/prisma'
import {
  isDevelopmentPremiumBypassEnabled,
  prismaWhereSubscriptionGrantsPremium
} from '@/lib/premiumUtils'
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

  if (isDevelopmentPremiumBypassEnabled()) {
    return NextResponse.json({
      status: 'active',
      currentPeriodEnd: new Date('2099-12-31T23:59:59.000Z').toISOString(),
      currentPeriodStart: new Date().toISOString(),
      hasPremiumAccess: true,
      developmentBypass: true
    })
  }

  const sessionEmail = session.user.email?.trim()
  if (
    sessionEmail &&
    hasComplimentaryAccess(sessionEmail, session.user.id)
  ) {
    const farFuture = new Date('2099-12-31T23:59:59.000Z')
    console.log(
      '[API /stripe/subscription] ✅ Acesso cortesia (Plus + biblioteca):',
      sessionEmail
    )
    return NextResponse.json({
      status: 'active',
      currentPeriodEnd: farFuture.toISOString(),
      currentPeriodStart: new Date().toISOString(),
      hasPremiumAccess: true,
      complimentary: true
    })
  }

  const dbUser = !sessionEmail
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true }
      })
    : null
  if (
    dbUser?.email &&
    hasComplimentaryAccess(dbUser.email, session.user.id)
  ) {
    const farFuture = new Date('2099-12-31T23:59:59.000Z')
    return NextResponse.json({
      status: 'active',
      currentPeriodEnd: farFuture.toISOString(),
      currentPeriodStart: new Date().toISOString(),
      hasPremiumAccess: true,
      complimentary: true
    })
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

  const premiumWhere = {
    userId: session.user.id,
    ...prismaWhereSubscriptionGrantsPremium()
  }

  const activeSubscriptions = await prisma.subscription.findMany({
    where: premiumWhere,
    select: {
      id: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true
    },
    orderBy: { currentPeriodEnd: 'desc' }
  })

  console.log(
    '[API /stripe/subscription] ✅ Assinaturas com acesso premium:',
    activeSubscriptions.length
  )
  activeSubscriptions.forEach((s, index) => {
    console.log(`[API /stripe/subscription] ✅ Premium ${index + 1}:`, {
      id: s.id,
      status: s.status,
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString()
    })
  })

  const sub = await prisma.subscription.findFirst({
    where: premiumWhere,
    select: {
      status: true,
      currentPeriodEnd: true,
      currentPeriodStart: true
    },
    orderBy: { currentPeriodEnd: 'desc' }
  })

  if (!sub) {
    console.log('[API /stripe/subscription] ⚠️ Sem acesso premium (gratuito ou período encerrado)')
    const duration = Date.now() - requestStart
    console.log('[API /stripe/subscription] ⏱️ Tempo total:', duration, 'ms')
    console.log('[API /stripe/subscription] ====== FIM VERIFICAÇÃO ASSINATURA ======')
    return NextResponse.json({
      status: 'canceled',
      currentPeriodEnd: null,
      currentPeriodStart: null,
      hasPremiumAccess: false
    })
  }

  console.log('[API /stripe/subscription] ✅ Assinatura usada para acesso:', {
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString()
  })

  const duration = Date.now() - requestStart
  console.log('[API /stripe/subscription] ⏱️ Tempo total:', duration, 'ms')
  console.log('[API /stripe/subscription] ====== FIM VERIFICAÇÃO ASSINATURA ======')

  return NextResponse.json({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    hasPremiumAccess: true
  })
}

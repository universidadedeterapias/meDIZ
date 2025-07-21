import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    select: {
      status: true,
      currentPeriodEnd: true
    }
  })

  if (!sub) {
    // Sem assinatura => tratado como cancelado
    return NextResponse.json({
      status: 'canceled',
      currentPeriodEnd: null
    })
  }

  return NextResponse.json({
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString()
  })
}

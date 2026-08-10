import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const accepted = body?.accepted === true
  const now = new Date()

  const profile = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      discoveryCompleted: !accepted,
      consentedAt: accepted ? now : null
    },
    update: {
      discoveryCompleted: !accepted,
      ...(accepted ? { consentedAt: now } : {})
    },
    select: {
      discoveryCompleted: true,
      consentedAt: true
    }
  })

  return NextResponse.json({
    discoveryCompleted: profile.discoveryCompleted,
    consentedAt: profile.consentedAt?.toISOString() ?? null
  })
}

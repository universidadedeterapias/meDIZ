import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  generateTemporaryPassword,
  hashPassword
} from '@/lib/library/temporaryPassword'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ userId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { userId } = await context.params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, whatsappSentAt: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.whatsappSentAt) {
    return NextResponse.json(
      { error: 'Cannot regenerate after credentials were marked as sent' },
      { status: 400 }
    )
  }

  const temporaryPassword = generateTemporaryPassword(10)
  const passwordHash = await hashPassword(temporaryPassword)

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      temporaryPasswordPlain: temporaryPassword,
      mustResetPassword: true,
      whatsappSentAt: null
    }
  })

  return NextResponse.json({
    ok: true,
    temporary_password: temporaryPassword
  })
}

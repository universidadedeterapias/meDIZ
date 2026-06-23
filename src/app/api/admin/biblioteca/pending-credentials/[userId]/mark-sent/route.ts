import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ userId: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { userId } = await context.params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, temporaryPasswordPlain: true }
  })

  if (!user?.temporaryPasswordPlain) {
    return NextResponse.json({ error: 'User not found or not pending' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { whatsappSentAt: new Date() }
  })

  return NextResponse.json({ ok: true })
}

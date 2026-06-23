import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  getUserBonusAccessSnapshot,
  updateUserBonuses
} from '@/lib/admin/user-bonus-access'
import { logUserAction, AuditActions } from '@/lib/auditLogger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

const updateBodySchema = z.object({
  grantProductIds: z.array(z.string().uuid()).optional(),
  revokeProductIds: z.array(z.string().uuid()).optional()
})

export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  const snapshot = await getUserBonusAccessSnapshot(user.id, user.email)
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true }
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = updateBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { grantProductIds, revokeProductIds } = parsed.data
  const hasGrant = (grantProductIds?.length ?? 0) > 0
  const hasRevoke = (revokeProductIds?.length ?? 0) > 0

  if (!hasGrant && !hasRevoke) {
    return NextResponse.json(
      { error: 'Selecione produtos para liberar ou revogar' },
      { status: 400 }
    )
  }

  const admin = await prisma.user.findUnique({
    where: { email: auth.user.email },
    select: { id: true }
  })

  const result = await updateUserBonuses({
    email: user.email,
    adminUserId: admin?.id ?? auth.user.id,
    grantProductIds,
    revokeProductIds
  })

  const snapshot = await getUserBonusAccessSnapshot(user.id, user.email)

  if (admin) {
    await logUserAction(
      admin.id,
      auth.user.email,
      AuditActions.USER_UPDATE,
      user.id,
      {
        action: hasRevoke ? 'update_library_bonuses' : 'grant_library_bonuses',
        grantProductIds,
        revokeProductIds,
        granted: result.granted,
        revoked: result.revoked
      },
      req
    )
  }

  return NextResponse.json({
    ok: true,
    granted: result.granted,
    revoked: result.revoked,
    permissoes: result.permissoes,
    ...snapshot
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { AuditActions, AuditResources, extractRequestInfo, logAuditAction } from '@/lib/auditLogger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string; factId: string }> }

/** "Esquecer isso" acionado pelo admin (suporte corrigindo/removendo um fato específico). */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id, factId } = await context.params

  const fact = await prisma.userFact.findFirst({ where: { id: factId, userId: id } })
  if (!fact) {
    return NextResponse.json({ error: 'Fato não encontrado' }, { status: 404 })
  }

  await prisma.userFact.delete({ where: { id: factId } })

  const { ipAddress, userAgent } = extractRequestInfo(req)
  await logAuditAction({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: AuditActions.PROFILE_FORGOTTEN,
    resource: AuditResources.USER,
    resourceId: id,
    details: { selfService: false, factId, fact: fact.fact, type: fact.type },
    ipAddress,
    userAgent
  })

  return NextResponse.json({ success: true })
}

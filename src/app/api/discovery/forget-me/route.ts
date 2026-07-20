import { auth } from '@/auth'
import { AuditActions, AuditResources, extractRequestInfo, logAuditAction } from '@/lib/auditLogger'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * "Esquecer de mim" (LGPD) — apaga tudo que o meDIZ aprendeu sobre a pessoa: o perfil de
 * descoberta (UserProfile, incluindo consentimento, compactProfile e lifeCompact do ID Vida)
 * e todos os UserFact (marcos/fios abertos). Também apaga DiscoveryEvent/ConversationEvent
 * ainda não processados, pra não ressuscitar dado por um evento em voo. Exclusão real, não
 * soft-delete.
 */
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userId = session.user.id
  const userEmail = session.user.email

  await prisma.$transaction([
    prisma.discoveryEvent.deleteMany({ where: { userId } }),
    prisma.conversationEvent.deleteMany({ where: { userId, status: { in: ['pending', 'processing', 'failed'] } } }),
    prisma.userFact.deleteMany({ where: { userId } }),
    prisma.userProfile.deleteMany({ where: { userId } })
  ])

  const { ipAddress, userAgent } = extractRequestInfo(request)
  await logAuditAction({
    adminId: userId,
    adminEmail: userEmail,
    action: AuditActions.PROFILE_FORGOTTEN,
    resource: AuditResources.USER,
    resourceId: userId,
    details: { selfService: true },
    ipAddress,
    userAgent
  })

  return NextResponse.json({ success: true })
}

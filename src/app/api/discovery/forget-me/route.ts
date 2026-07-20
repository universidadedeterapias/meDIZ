import { auth } from '@/auth'
import { AuditActions, AuditResources, extractRequestInfo, logAuditAction } from '@/lib/auditLogger'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * "Esquecer de mim" (LGPD) — apaga o perfil de descoberta do usuário logado (UserProfile,
 * incluindo consentimento e id_compacto) e qualquer DiscoveryEvent ainda não processado, pra
 * não ressuscitar o perfil por um evento em voo. Exclusão real, não soft-delete.
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

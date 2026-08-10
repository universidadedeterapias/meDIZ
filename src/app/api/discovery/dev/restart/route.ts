import { auth } from '@/auth'
import { isDiscoveryTestModeEnabled } from '@/lib/discovery-access'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Reinicia o fluxo de descoberta do usuario logado, apagando UserProfile/DiscoveryEvent —
 * so existe para permitir repetir o teste manual em HML (`DISCOVERY_TEST_MODE=true`).
 */
export async function POST() {
  if (!isDiscoveryTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await prisma.$transaction([
    prisma.discoveryEvent.deleteMany({ where: { userId: session.user.id } }),
    prisma.userProfile.deleteMany({ where: { userId: session.user.id } })
  ])

  return NextResponse.json({ success: true })
}

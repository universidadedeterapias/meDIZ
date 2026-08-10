import { auth } from '@/auth'
import {
  getDiscoveryRolloutConfig,
  isDiscoveryTestModeEnabled,
  shouldRunDiscovery
} from '@/lib/discovery-access'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        createdAt: true,
        userProfile: {
          select: {
            discoveryCompleted: true,
            consentedAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const rollout = getDiscoveryRolloutConfig()
    const requiresDiscovery = shouldRunDiscovery({
      userCreatedAt: user.createdAt,
      discoveryCompleted: user.userProfile?.discoveryCompleted,
      enabled: rollout.enabled,
      rolloutStartedAt: rollout.rolloutStartedAt
    })

    return NextResponse.json({
      featureEnabled: rollout.enabled,
      requiresDiscovery,
      discoveryCompleted: user.userProfile?.discoveryCompleted ?? false,
      consentedAt: user.userProfile?.consentedAt?.toISOString() ?? null,
      testMode: isDiscoveryTestModeEnabled()
    })
  } catch (error) {
    console.error('[Discovery Status] Falha ao consultar elegibilidade:', error)
    return NextResponse.json({
      featureEnabled: false,
      requiresDiscovery: false,
      discoveryCompleted: true,
      consentedAt: null,
      testMode: false,
      degraded: true
    })
  }
}

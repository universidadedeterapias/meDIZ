import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {
  DISCOVERY_MAX_DISMISSALS,
  DISCOVERY_DISMISS_COOLDOWN_DAYS
} from '@/lib/discovery-access'

export const dynamic = 'force-dynamic'

/**
 * "Agora nao" — a saida da descoberta que ate agora nao existia.
 *
 * A unica forma de sair do fluxo era recusar o consentimento, que gravava
 * `discoveryCompleted = true` e tirava a pessoa do convite para sempre. E quem
 * aceitava e nao conseguia concluir nem essa saida tinha, porque a tela de
 * consentimento deixava de aparecer.
 *
 * Adiar nao mexe em `discoveryCompleted`: a descoberta continua pendente e
 * disponivel, so para de ser oferecida por alguns dias.
 */
export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const now = new Date()

    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        discoveryDismissedAt: now,
        discoveryDismissCount: 1
      },
      update: {
        discoveryDismissedAt: now,
        discoveryDismissCount: { increment: 1 }
      },
      select: { discoveryDismissCount: true }
    })

    return NextResponse.json({
      ok: true,
      dismissCount: profile.discoveryDismissCount,
      /** Falso quando passou do limite: o convite para de aparecer sozinho. */
      willSuggestAgain: profile.discoveryDismissCount < DISCOVERY_MAX_DISMISSALS,
      cooldownDays: DISCOVERY_DISMISS_COOLDOWN_DAYS
    })
  } catch (error) {
    console.error('[Discovery Dismiss] Falha ao adiar:', error)
    return NextResponse.json(
      { error: 'Não foi possível adiar agora' },
      { status: 500 }
    )
  }
}

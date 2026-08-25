import { auth } from '@/auth'
import { burnAccessLinks } from '@/lib/auth/access-link'
import {
  getDiscoveryRolloutConfig,
  isDiscoveryTestModeEnabled,
  shouldRequireDiscovery,
  shouldRunDiscovery,
  shouldSuggestDiscovery
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
            consentedAt: true,
            discoveryDismissedAt: true,
            discoveryDismissCount: true,
            firstAccessAt: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Primeira visita: registra e nao convida ninguem agora. O convite comeca a
    // valer da proxima vez que a pessoa entrar — quem acabou de comprar um livro
    // le o livro antes de ser convidado a qualquer outra coisa.
    //
    // A escrita acontece num GET de proposito: e o primeiro ponto do app por onde
    // toda sessao autenticada passa, e e idempotente (so grava quando esta nulo).
    const firstAccessAt = user.userProfile?.firstAccessAt ?? null
    if (!firstAccessAt) {
      await prisma.userProfile
        .upsert({
          where: { userId: session.user.id },
          create: { userId: session.user.id, firstAccessAt: new Date() },
          update: { firstAccessAt: new Date() },
          select: { id: true }
        })
        .catch(() => undefined)

      // Chegar aqui e a prova que faltava: sessao valida e app carregado. So
      // agora o link de acesso pode morrer. Antes ele era queimado na validacao
      // do token, e quem tropecasse no meio do caminho ficava de fora com o link
      // ja destruido.
      await burnAccessLinks(session.user.id)
    }

    const rollout = getDiscoveryRolloutConfig()
    const eligible = shouldRunDiscovery({
      userCreatedAt: user.createdAt,
      discoveryCompleted: user.userProfile?.discoveryCompleted,
      enabled: rollout.enabled,
      rolloutStartedAt: rollout.rolloutStartedAt
    })

    const criteria = {
      eligible,
      firstAccessAt,
      dismissedAt: user.userProfile?.discoveryDismissedAt,
      dismissCount: user.userProfile?.discoveryDismissCount
    }

    const suggestDiscovery = shouldSuggestDiscovery(criteria)
    const requiresDiscovery = shouldRequireDiscovery(criteria)

    return NextResponse.json({
      featureEnabled: rollout.enabled,
      /** A descoberta faz sentido para esta pessoa (feature, rollout, nao concluida). */
      eligibleForDiscovery: eligible,
      /** Terceira e ultima aparicao: deixou de ser dispensavel. */
      requiresDiscovery,
      /** Convite dispensavel (nunca na primeira visita, respeita o silencio). */
      suggestDiscovery,
      discoveryCompleted: user.userProfile?.discoveryCompleted ?? false,
      consentedAt: user.userProfile?.consentedAt?.toISOString() ?? null,
      dismissedAt: user.userProfile?.discoveryDismissedAt?.toISOString() ?? null,
      dismissCount: user.userProfile?.discoveryDismissCount ?? 0,
      testMode: isDiscoveryTestModeEnabled()
    })
  } catch (error) {
    console.error('[Discovery Status] Falha ao consultar elegibilidade:', error)
    return NextResponse.json({
      featureEnabled: false,
      eligibleForDiscovery: false,
      requiresDiscovery: false,
      suggestDiscovery: false,
      discoveryCompleted: true,
      consentedAt: null,
      dismissedAt: null,
      dismissCount: 0,
      testMode: false,
      degraded: true
    })
  }
}

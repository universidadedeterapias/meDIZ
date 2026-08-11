import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getTutorialUrl } from '@/lib/tutorial'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const tutorialUrl = getTutorialUrl()

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { tutorialSeenAt: true }
    })

    return NextResponse.json({
      // Sem perfil ainda == nunca viu: a base antiga entra no tutorial no
      // proximo acesso, que e o objetivo do lancamento do 2.0.
      requiresTutorial: !profile?.tutorialSeenAt,
      tutorialSeenAt: profile?.tutorialSeenAt?.toISOString() ?? null,
      tutorialUrl
    })
  } catch (error) {
    console.error('[Tutorial Status] Falha ao consultar:', error)
    // Falha de leitura nao pode prender ninguem num gate: o /chat trata
    // `requiresTutorial: false` como "segue o jogo".
    return NextResponse.json({
      requiresTutorial: false,
      tutorialSeenAt: null,
      tutorialUrl,
      degraded: true
    })
  }
}

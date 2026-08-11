import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Marca o tutorial como visto. Concluir e pular gravam a mesma coisa — o gate so
 * pergunta "ja passou por aqui?", e quem pulou pode rever pela sidebar quando
 * quiser. `skipped` entra apenas no log, para dar noçao de quantos pulam.
 */
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const skipped = body?.skipped === true
  const now = new Date()

  try {
    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        tutorialSeenAt: now
      },
      update: {
        tutorialSeenAt: now
      }
    })

    console.info(
      `[Tutorial] Concluído (${skipped ? 'pulado' : 'assistido'}) por ${session.user.id}`
    )

    return NextResponse.json({ success: true, tutorialSeenAt: now.toISOString() })
  } catch (error) {
    console.error('[Tutorial Complete] Falha ao gravar:', error)
    return NextResponse.json(
      { error: 'Não foi possível registrar o tutorial agora' },
      { status: 500 }
    )
  }
}

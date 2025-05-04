// app/api/chat/[sessionId]/favorite/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { sessionId } = params
  const chat = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id }
  })
  if (!chat) {
    return NextResponse.json(
      { error: 'Sessão não encontrada' },
      { status: 404 }
    )
  }

  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: { isFavorite: !chat.isFavorite }
  })

  return NextResponse.json({ isFavorite: updated.isFavorite })
}

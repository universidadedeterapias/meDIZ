import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  isConversationalChatKind,
  isMedizAgent
} from '@/lib/conversational-chat/config'
import { isUserPremium } from '@/lib/premiumUtils'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const hasPremium = await isUserPremium(session.user.id)
  if (!hasPremium) {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para assinantes premium' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const chatKindRaw = searchParams.get('chatKind')?.trim() ?? ''
  if (!isConversationalChatKind(chatKindRaw)) {
    return NextResponse.json({ error: 'chatKind inválido' }, { status: 400 })
  }

  const sessions = await prisma.chatSession.findMany({
    where: {
      userId: session.user.id,
      chatKind: chatKindRaw,
      threadId: { not: null }
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      threadId: true,
      agent: true,
      createdAt: true,
      messages: {
        where: { role: 'USER' },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { content: true }
      }
    }
  })

  return NextResponse.json({
    sessions: sessions.map((row) => ({
      id: row.id,
      threadId: row.threadId!,
      agent: isMedizAgent(row.agent ?? '') ? row.agent : null,
      createdAt: row.createdAt.toISOString(),
      firstUserMessage: row.messages[0]?.content ?? ''
    }))
  })
}

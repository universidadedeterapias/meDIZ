import { validateWebhookBearer } from '@/lib/webhookAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  sessionId: z.string().uuid(),
  from: z.coerce.number().int().min(0),
  to: z.coerce.number().int().min(1)
})

/**
 * Chamado pelo worker do ID Vida (Story 4.3, fora deste repo) para buscar o texto da fatia de
 * conversa referenciada pelo payload de um ConversationEvent (fromMessageCount/toMessageCount).
 * A fatia é por posição (mensagem N até M da sessão, 1-indexado por createdAt) — assume que
 * ChatMessage nunca é deletada fora de ordem (mesma premissa documentada na Story 4.1).
 */
export async function GET(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'CONVERSATION_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedQuery = querySchema.safeParse({
    sessionId: request.nextUrl.searchParams.get('sessionId'),
    from: request.nextUrl.searchParams.get('from'),
    to: request.nextUrl.searchParams.get('to')
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { sessionId, from, to } = parsedQuery.data
  if (to <= from) {
    return NextResponse.json({ error: '"to" deve ser maior que "from"' }, { status: 400 })
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatSessionId: sessionId },
    orderBy: { createdAt: 'asc' },
    skip: from,
    take: to - from,
    select: { role: true, content: true, createdAt: true }
  })

  return NextResponse.json({
    sessionId,
    from,
    to,
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString()
    }))
  })
}

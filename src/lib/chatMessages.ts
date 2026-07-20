import { prisma } from './prisma'

export type ChatMessageRole = 'USER' | 'ASSISTANT'

interface SaveChatMessageParams {
  chatSessionId: string
  role: ChatMessageRole
  content: string
}

/** Quantidade de mensagens novas (desde o último checkpoint) que dispara um ConversationEvent. */
const CHECKPOINT_MESSAGE_THRESHOLD = Number(
  process.env.CONVERSATION_CHECKPOINT_MESSAGE_THRESHOLD ?? 14
)

interface ThreadMessages {
  assistant: string[]
  user: string[]
}

async function getChatSessionIdByThread(threadId: string) {
  if (!threadId) {
    return null
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { threadId },
    select: { id: true }
  })

  return chatSession?.id ?? null
}

export async function saveChatMessage({
  chatSessionId,
  role,
  content
}: SaveChatMessageParams) {
  return prisma.$transaction(async (tx) => {
    const saved = await tx.chatMessage.create({
      data: {
        chatSessionId,
        role,
        content
      }
    })

    const session = await tx.chatSession.update({
      where: { id: chatSessionId },
      data: { messageCount: { increment: 1 } },
      select: {
        id: true,
        userId: true,
        threadId: true,
        messageCount: true,
        lastCheckpointMessageCount: true
      }
    })

    const unprocessedCount = session.messageCount - session.lastCheckpointMessageCount
    if (unprocessedCount >= CHECKPOINT_MESSAGE_THRESHOLD) {
      await tx.conversationEvent.create({
        data: {
          userId: session.userId,
          sessionId: session.id,
          trigger: 'message_count',
          payload: {
            threadId: session.threadId,
            fromMessageCount: session.lastCheckpointMessageCount,
            toMessageCount: session.messageCount
          }
        }
      })
      await tx.chatSession.update({
        where: { id: session.id },
        data: { lastCheckpointMessageCount: session.messageCount }
      })
    }

    return saved
  })
}

export type OrderedChatMessage = {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: Date
}

export async function getOrderedThreadMessages(
  threadId: string
): Promise<OrderedChatMessage[]> {
  const chatSessionId = await getChatSessionIdByThread(threadId)
  if (!chatSessionId) return []

  return prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true
    }
  })
}

export async function getChatSessionForUser(threadId: string, userId: string) {
  return prisma.chatSession.findFirst({
    where: { threadId, userId },
    select: {
      id: true,
      threadId: true,
      chatKind: true,
      agent: true,
      routingStatus: true,
      routingDestination: true,
      routingIntentSummary: true,
      routingQuestionCount: true
    }
  })
}

export async function getThreadMessages(threadId: string): Promise<ThreadMessages> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:43',message:'getThreadMessages entry',data:{threadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  const chatSessionId = await getChatSessionIdByThread(threadId)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:45',message:'ChatSessionId found',data:{chatSessionId:chatSessionId||'null',threadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (!chatSessionId) {
    return { assistant: [], user: [] }
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      content: true
    }
  })
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:57',message:'Messages found in database',data:{totalMessages:messages.length,assistantMessages:messages.filter(m=>m.role==='ASSISTANT').length,userMessages:messages.filter(m=>m.role==='USER').length,roles:messages.map(m=>m.role)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  const result = messages.reduce<ThreadMessages>(
    (acc, message) => {
      if (message.role === 'ASSISTANT') {
        acc.assistant.push(message.content)
      } else if (message.role === 'USER') {
        acc.user.push(message.content)
      }
      return acc
    },
    { assistant: [], user: [] }
  )
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:69',message:'getThreadMessages result',data:{assistantCount:result.assistant.length,userCount:result.user.length,firstAssistantPreview:result.assistant[0]?.substring(0,100)||'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  return result
}

export async function getThreadUserMessages(threadId: string) {
  
  const chatSessionId = await getChatSessionIdByThread(threadId)

  if (!chatSessionId) {
    return []
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatSessionId,
      role: 'USER'
    },
    orderBy: { createdAt: 'asc' },
    select: {
      content: true
    }
  })

  return messages.map(message => message.content)
}


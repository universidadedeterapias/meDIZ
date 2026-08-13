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
  const chatSessionId = await getChatSessionIdByThread(threadId)

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


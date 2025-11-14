import { prisma } from './prisma'

export type ChatMessageRole = 'USER' | 'ASSISTANT'

interface SaveChatMessageParams {
  chatSessionId: string
  role: ChatMessageRole
  content: string
}

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
  await prisma.chatMessage.create({
    data: {
      chatSessionId,
      role,
      content
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

  return messages.reduce<ThreadMessages>(
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


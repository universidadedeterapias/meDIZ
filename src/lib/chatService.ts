// lib/chatService.ts

import type { ChatKind } from '@prisma/client'
import type { MedizAgent } from '@/lib/conversational-chat/config'
import { prisma } from './prisma'

/**
 * Cria uma nova sessão de chat, já vinculando o threadId.
 */
export async function createChatSessionWithThread(
  userId: string,
  threadId: string,
  chatKind: ChatKind = 'SEARCH',
  agent?: MedizAgent
) {
  return prisma.chatSession.create({
    data: {
      userId,
      threadId,
      chatKind,
      agent
    }
  })
}

/**
 * (Opcional) Se você ainda quiser lógica separada:
 */
export async function createChatSession(userId: string) {
  return prisma.chatSession.create({ data: { userId } })
}

export async function attachThreadToSession(
  sessionId: string,
  threadId: string
) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { threadId }
  })
}

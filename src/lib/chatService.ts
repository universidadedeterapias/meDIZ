// lib/chatService.ts

import type { ChatKind } from '@prisma/client'
import type { MedizAgent } from '@/lib/conversational-chat/config'
import { prisma } from './prisma'

type DirtySession = {
  id: string
  user_id: string
  thread_id: string | null
  message_count: number
  last_checkpoint_message_count: number
}

/**
 * Enfileira um ConversationEvent (trigger: new_session) para a sessão mais recente
 * do usuário que ainda tem conteúdo não extraído (messageCount > lastCheckpointMessageCount).
 * Marca essa sessão como checkpointada (lastCheckpointMessageCount = messageCount) pelo
 * mesmo motivo do gatilho por contagem: não reenfileirar a mesma sessão a cada nova sessão
 * aberta depois dela.
 */
async function enqueueNewSessionCheckpointIfDirty(userId: string) {
  const [dirtySession] = await prisma.$queryRaw<DirtySession[]>`
    SELECT "id", "userId" AS user_id, "threadId" AS thread_id, "message_count", "last_checkpoint_message_count"
    FROM "ChatSession"
    WHERE "userId" = ${userId} AND "message_count" > "last_checkpoint_message_count"
    ORDER BY "startedAt" DESC
    LIMIT 1
  `

  if (!dirtySession) return

  await prisma.$transaction([
    prisma.conversationEvent.create({
      data: {
        userId: dirtySession.user_id,
        sessionId: dirtySession.id,
        trigger: 'new_session',
        payload: {
          threadId: dirtySession.thread_id,
          fromMessageCount: dirtySession.last_checkpoint_message_count,
          toMessageCount: dirtySession.message_count
        }
      }
    }),
    prisma.chatSession.update({
      where: { id: dirtySession.id },
      data: { lastCheckpointMessageCount: dirtySession.message_count }
    })
  ])
}

/**
 * Cria uma nova sessão de chat, já vinculando o threadId.
 */
export async function createChatSessionWithThread(
  userId: string,
  threadId: string,
  chatKind: ChatKind = 'SEARCH',
  agent?: MedizAgent
) {
  await enqueueNewSessionCheckpointIfDirty(userId)

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

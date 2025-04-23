import { prisma } from './prisma'

export async function getOrCreateChatSession(userId: string) {
  const existing = await prisma.chatSession.findFirst({
    where: { userId, endedAt: null }
  })

  if (existing) return existing

  return prisma.chatSession.create({
    data: { userId }
  })
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

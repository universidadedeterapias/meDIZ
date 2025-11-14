/**
 * Popula a tabela de cache com respostas extensas já existentes.
 * Execute com: npx tsx src/scripts/populate-chat-cache.ts
 */

import { prisma } from '../lib/prisma'
import {
  normalizeSymptom,
  shouldCacheResponse,
  saveCachedAssistantResponse
} from '../lib/chatCache'

const BATCH_SIZE = 100

async function processBatch(lastId: string | null) {
  const sessions = await prisma.chatSession.findMany({
    take: BATCH_SIZE,
    ...(lastId
      ? {
          skip: 1,
          cursor: { id: lastId }
        }
      : {}),
    orderBy: { createdAt: 'asc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          content: true
        }
      }
    }
  })

  if (!sessions.length) {
    return { sessions: [], lastId: null }
  }

  const lastSessionId = sessions[sessions.length - 1]?.id ?? null
  return { sessions, lastId: lastSessionId }
}

async function main() {
  console.log('▶️  Iniciando população do cache de respostas...')

  let processedSessions = 0
  let cachedResponses = 0
  let skippedSessions = 0
  let cursor: string | null = null

  while (true) {
    const { sessions, lastId } = await processBatch(cursor)
    if (!sessions.length) {
      break
    }

    for (const session of sessions) {
      processedSessions += 1

      if (!session.threadId) {
        skippedSessions += 1
        continue
      }

      const firstUserMessage = session.messages.find(
        message => message.role === 'USER'
      )
      const lastAssistantMessage = [...session.messages]
        .reverse()
        .find(message => message.role === 'ASSISTANT')

      if (!firstUserMessage || !lastAssistantMessage) {
        skippedSessions += 1
        continue
      }

      const normalizedQuestion = normalizeSymptom(firstUserMessage.content)
      if (!normalizedQuestion) {
        skippedSessions += 1
        continue
      }

      if (
        !shouldCacheResponse(lastAssistantMessage.content, {
          normalizedQuestion
        })
      ) {
        skippedSessions += 1
        continue
      }

      await saveCachedAssistantResponse({
        normalizedKey: normalizedQuestion,
        content: lastAssistantMessage.content,
        sourceThreadId: session.threadId
      })

      cachedResponses += 1
    }

    cursor = lastId
    console.log(
      `📦 Processados: ${processedSessions} | Cacheadas: ${cachedResponses} | Ignoradas: ${skippedSessions}`
    )
  }

  console.log('✅ População concluída!')
  console.log(
    `Resumo final → Processados: ${processedSessions}, Cacheadas: ${cachedResponses}, Ignoradas: ${skippedSessions}`
  )
}

main()
  .catch(error => {
    console.error('❌ Erro ao popular cache:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


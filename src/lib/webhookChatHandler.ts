import { randomUUID } from 'crypto'

import { auth } from '@/auth'
import { getMessages } from '@/lib/assistant'
import { createChatSessionWithThread } from '@/lib/chatService'
import { saveChatMessage } from '@/lib/chatMessages'
import { DEFAULT_LANGUAGE, getLanguageMapping, isSupportedLanguage, type LanguageCode } from '@/i18n/config'
import { isUserPremium } from '@/lib/premiumUtils'
import { prisma } from '@/lib/prisma'
import { isRetryableError, withRetryAndCircuitBreaker } from '@/lib/retry'
import { getUserLimits, getUserPeriod } from '@/lib/userPeriod'
import { NextResponse } from 'next/server'

type WebhookChatConfig = {
  webhookUrl: string
  webhookKey: string
  reuseThreadFromRequest?: boolean
}

async function requestAssistantResponse(
  threadId: string,
  message: string,
  language: LanguageCode,
  config: WebhookChatConfig
) {
  const langMapping = getLanguageMapping(language)
  let messageWithLanguage = message

  if (language !== 'pt-BR' && language !== 'pt-PT') {
    const languageTag = language === 'en' ? '[english]' : language === 'es' ? '[espanol]' : `[${language}]`
    messageWithLanguage = `${languageTag} ${message}`
  }

  const payload = {
    threadId,
    sintoma: messageWithLanguage,
    sintomaOriginal: message,
    language,
    lang: langMapping.iso6391,
    locale: language,
    idioma: langMapping.namePortuguese,
    idiomaResposta: langMapping.nameNative,
    responderEm: langMapping.nameNative,
    iso6391: langMapping.iso6391,
    iso6392: langMapping.iso6392,
    instrucaoIdioma: langMapping.instruction,
    languageInstruction: langMapping.instruction,
    languageName: langMapping.nameEnglish,
    nomeIdioma: langMapping.namePortuguese
  }

  const response = await withRetryAndCircuitBreaker(
    config.webhookKey,
    async () => {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        const error = new Error(
          `Webhook do n8n retornou ${res.status} - ${res.statusText} ${errorText ? `- ${errorText}` : ''}`
        )
        ;(error as { status?: number }).status = res.status
        throw error
      }

      return res
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 5000,
      shouldRetry: (error) => isRetryableError(error),
      onRetry: (error, attempt, delay) => {
        console.warn(
          `[WebhookChat] Retry ${attempt}/3 para ${config.webhookKey} após ${delay}ms:`,
          error instanceof Error ? error.message : error
        )
      }
    }
  )

  const responseText = await response.text()
  let assistantReply: string

  try {
    const jsonResponse = JSON.parse(responseText)
    assistantReply =
      jsonResponse.resposta ||
      jsonResponse.response ||
      jsonResponse.message ||
      jsonResponse.text ||
      jsonResponse.content ||
      (typeof jsonResponse === 'string' ? jsonResponse : responseText)
  } catch {
    assistantReply = responseText
  }

  let normalized = assistantReply.trim()

  if (normalized.includes('\\n') || normalized.includes('\\r') || normalized.includes('\\t')) {
    let previousLength = 0
    let iterations = 0

    while (normalized.length !== previousLength && iterations < 3) {
      previousLength = normalized.length
      iterations++
      normalized = normalized
        .replace(/\\\\n/g, '\n')
        .replace(/\\\\r/g, '')
        .replace(/\\\\t/g, ' ')
        .replace(/\\\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\"/g, '"')
    }
  }

  normalized = normalized.trim()
  normalized = normalized.replace(/^\n{3,}/g, '\n\n').replace(/\n{3,}$/g, '\n\n')

  if (!normalized) {
    throw new Error('Webhook do n8n retornou resposta vazia após processamento')
  }

  return normalized
}

export async function handleWebhookChatRequest(req: Request, config: WebhookChatConfig) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json()
  const rawMessage = typeof body?.message === 'string' ? body.message : ''
  const message = rawMessage.trim()
  const rawThreadId = typeof body?.threadId === 'string' ? body.threadId.trim() : ''
  const requestedLanguage = typeof body?.language === 'string' ? (body.language as string) : undefined
  const language: LanguageCode = isSupportedLanguage(requestedLanguage)
    ? (requestedLanguage as LanguageCode)
    : DEFAULT_LANGUAGE

  if (!message) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  try {
    let threadId: string = randomUUID()
    let chatSession = null as Awaited<ReturnType<typeof createChatSessionWithThread>> | null

    if (config.reuseThreadFromRequest && rawThreadId) {
      const existingSession = await prisma.chatSession.findFirst({
        where: {
          userId,
          threadId: rawThreadId
        },
        select: {
          id: true,
          userId: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          updatedAt: true,
          threadId: true,
          isFavorite: true
        }
      })

      if (existingSession?.threadId) {
        threadId = existingSession.threadId
        chatSession = existingSession
      }
    }

    const isNewConversation = !chatSession

    if (isNewConversation) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const todayCount = await prisma.chatSession.count({
        where: {
          userId,
          createdAt: { gte: startOfDay }
        }
      })

      const hasPremiumAccess = await isUserPremium(userId)

      if (!hasPremiumAccess) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { createdAt: true }
        })

        if (!user) {
          return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        const userPeriod = getUserPeriod(user.createdAt)
        const { searchLimit } = getUserLimits(userPeriod)

        if (todayCount >= searchLimit) {
          return NextResponse.json(
            {
              limitReached: true,
              period: userPeriod,
              searchLimit
            },
            { status: 403 }
          )
        }
      }

      chatSession = await createChatSessionWithThread(userId, threadId)
    }

    await saveChatMessage({
      chatSessionId: chatSession.id,
      role: 'USER',
      content: message
    })

    let assistantReply = await requestAssistantResponse(threadId, message, language, config)

    if (assistantReply.trim().startsWith('{')) {
      try {
        const jsonParsed = JSON.parse(assistantReply)
        assistantReply = jsonParsed.resposta || jsonParsed.response || jsonParsed.message || assistantReply
      } catch {
        // mantém a resposta original quando não for JSON válido
      }
    }

    if (assistantReply) {
      const finalContent = assistantReply.trim().startsWith('{')
        ? (() => {
            try {
              const parsed = JSON.parse(assistantReply)
              return parsed.resposta || parsed.response || parsed.message || assistantReply
            } catch {
              return assistantReply
            }
          })()
        : assistantReply

      await saveChatMessage({
        chatSessionId: chatSession.id,
        role: 'ASSISTANT',
        content: finalContent
      })
    }

    const responses = await getMessages(threadId)
    const hasPremiumAccess = await isUserPremium(userId)

    if (!hasPremiumAccess) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
      })

      if (user) {
        const userPeriod = getUserPeriod(user.createdAt)
        const { fullVisualization } = getUserLimits(userPeriod)

        return NextResponse.json({
          responses,
          threadId,
          latestAssistantReply: assistantReply,
          userPeriod,
          fullVisualization,
          shouldShowPopup: true
        })
      }
    }

    return NextResponse.json({ responses, threadId, latestAssistantReply: assistantReply })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    let errorResponse = 'Erro ao processar assistant'

    if (errorMessage.includes('Webhook do n8n')) {
      errorResponse = 'Erro ao comunicar com o serviço de IA. Tente novamente em alguns instantes.'
    } else if (errorMessage.includes('resposta vazia')) {
      errorResponse = 'O serviço de IA não retornou uma resposta válida. Tente novamente.'
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorResponse = 'Não foi possível conectar ao serviço. Verifique sua conexão.'
    }

    return NextResponse.json(
      {
        error: errorResponse,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

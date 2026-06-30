import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { createChatSessionWithThread } from '@/lib/chatService'
import {
  getChatSessionForUser,
  getOrderedThreadMessages,
  saveChatMessage
} from '@/lib/chatMessages'
import {
  isMedizAgent,
  isConversationalChatKind,
  type MedizAgent,
  type ConversationalChatKind
} from '@/lib/conversational-chat/config'
import { isSimulatorMode } from '@/lib/conversational-chat/simulator-modes'
import {
  requestConversationalResponse,
  resolveRequestLanguage
} from '@/lib/conversational-chat/webhook'
import { isUserPremium } from '@/lib/premiumUtils'
import { prisma } from '@/lib/prisma'
import { getUserLimits, getUserPeriod } from '@/lib/userPeriod'

export const dynamic = 'force-dynamic'

function mapWebhookError(err: unknown): { status: number; message: string } {
  const errorMessage = err instanceof Error ? err.message : String(err)

  if (
    errorMessage.includes('chat_kind') ||
    errorMessage.includes('P2022') ||
    errorMessage.includes('Unknown argument')
  ) {
    return {
      status: 503,
      message:
        'Sistema em atualização. Aguarde alguns minutos ou contate o suporte.'
    }
  }

  if (
    errorMessage.includes('AbortError') ||
    errorMessage.includes('aborted') ||
    errorMessage.includes('timeout')
  ) {
    return {
      status: 504,
      message: 'A IA demorou para responder. Tente novamente.'
    }
  }

  if (errorMessage.includes('Webhook')) {
    return {
      status: 502,
      message:
        'Erro ao comunicar com o serviço de IA. Tente novamente em alguns instantes.'
    }
  }
  if (errorMessage.includes('resposta vazia')) {
    return {
      status: 502,
      message: 'O serviço de IA não retornou uma resposta válida. Tente novamente.'
    }
  }
  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND')
  ) {
    return {
      status: 503,
      message: 'Não foi possível conectar ao serviço. Verifique sua conexão.'
    }
  }

  return { status: 500, message: 'Erro ao processar mensagem' }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('threadId')?.trim()
  if (!threadId) {
    return NextResponse.json({ error: 'threadId obrigatório' }, { status: 400 })
  }

  const chatSession = await getChatSessionForUser(threadId, session.user.id)
  if (!chatSession) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const messages = await getOrderedThreadMessages(threadId)
  return NextResponse.json({
    threadId,
    chatKind: chatSession.chatKind,
    agent: isMedizAgent(chatSession.agent ?? '') ? chatSession.agent : null,
    messages
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await req.json()
  const rawMessage = typeof body?.message === 'string' ? body.message : ''
  const message = rawMessage.trim()
  const chatKindRaw = typeof body?.chatKind === 'string' ? body.chatKind : ''
  const existingThreadId =
    typeof body?.threadId === 'string' ? body.threadId.trim() : ''
  const language = resolveRequestLanguage(
    typeof body?.language === 'string' ? body.language : undefined
  )
  const simulatorModeRaw =
    typeof body?.simulatorMode === 'string' ? body.simulatorMode : ''
  const simulatorMode = isSimulatorMode(simulatorModeRaw)
    ? simulatorModeRaw
    : undefined
  const agentRaw = typeof body?.agent === 'string' ? body.agent.toLowerCase() : ''
  const agent: MedizAgent | undefined = isMedizAgent(agentRaw)
    ? agentRaw
    : undefined

  if (!message) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  if (!isConversationalChatKind(chatKindRaw)) {
    return NextResponse.json({ error: 'chatKind inválido' }, { status: 400 })
  }

  const chatKind = chatKindRaw as ConversationalChatKind

  if (chatKind === 'SEARCH' && !agent) {
    return NextResponse.json({ error: 'agent inválido' }, { status: 400 })
  }

  const hasPremium = await isUserPremium(userId)
  if (chatKind !== 'SEARCH' && !hasPremium) {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para assinantes premium' },
      { status: 403 }
    )
  }

  try {
    let threadId = existingThreadId
    let chatSessionId: string

    if (threadId) {
      const existing = await getChatSessionForUser(threadId, userId)
      if (!existing) {
        return NextResponse.json(
          { error: 'Conversa não encontrada' },
          { status: 404 }
        )
      }
      if (existing.chatKind !== chatKind) {
        return NextResponse.json(
          { error: 'Tipo de conversa incompatível' },
          { status: 400 }
        )
      }
      if (chatKind === 'SEARCH' && agent) {
        if (existing.agent && existing.agent !== agent) {
          return NextResponse.json(
            { error: 'Esta conversa pertence a outro agente' },
            { status: 409 }
          )
        }
        if (!existing.agent) {
          await prisma.chatSession.update({
            where: { id: existing.id },
            data: { agent }
          })
        }
      }
      chatSessionId = existing.id
    } else {
      if (chatKind === 'SEARCH' && !hasPremium) {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)
        const [todayCount, user] = await Promise.all([
          prisma.chatSession.count({
            where: {
              userId,
              chatKind: 'SEARCH',
              createdAt: { gte: startOfDay }
            }
          }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true }
          })
        ])

        if (!user) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 404 }
          )
        }

        const userPeriod = getUserPeriod(user.createdAt)
        const { searchLimit } = getUserLimits(userPeriod)
        if (todayCount >= searchLimit) {
          return NextResponse.json(
            { limitReached: true, period: userPeriod, searchLimit },
            { status: 403 }
          )
        }
      }

      threadId = randomUUID()
      const created = await createChatSessionWithThread(
        userId,
        threadId,
        chatKind,
        agent
      )
      chatSessionId = created.id
    }

    await saveChatMessage({
      chatSessionId,
      role: 'USER',
      content: message
    })

    const assistantResponse = await requestConversationalResponse({
      threadId,
      message,
      language,
      chatKind,
      agent,
      simulatorMode
    })

    const newMessages = []
    for (const assistantMessage of assistantResponse.messages) {
      const saved = await saveChatMessage({
        chatSessionId,
        role: 'ASSISTANT',
        content: assistantMessage.content
      })
      newMessages.push(saved)
    }

    const messages = await getOrderedThreadMessages(threadId)

    const accessMetadata =
      chatKind === 'SEARCH' && !hasPremium
        ? await prisma.user
            .findUnique({ where: { id: userId }, select: { createdAt: true } })
            .then((user) => {
              if (!user) return {}
              const userPeriod = getUserPeriod(user.createdAt)
              const { fullVisualization } = getUserLimits(userPeriod)
              return {
                userPeriod,
                fullVisualization,
                shouldShowPopup: true
              }
            })
        : {}

    return NextResponse.json({
      threadId,
      chatKind,
      agent,
      messages,
      newMessages,
      responseStatus: assistantResponse.status,
      action: assistantResponse.action,
      ...accessMetadata
    })
  } catch (err) {
    console.error('[conversational-chat] POST error:', err)
    const mapped = mapWebhookError(err)
    return NextResponse.json(
      {
        error: mapped.message,
        details:
          process.env.NODE_ENV === 'development' && err instanceof Error
            ? err.message
            : undefined
      },
      { status: mapped.status }
    )
  }
}

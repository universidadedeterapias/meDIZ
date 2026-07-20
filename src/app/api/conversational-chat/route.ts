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
  getAgentWelcomeMessage,
  getConciergeEntryMessage,
  destinationToSpecialist,
  isMedizAgent,
  isConversationalChatKind,
  type MedizAgent,
  type ConciergeDestination,
  type ConciergeEntryPoint,
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

const EXTERNAL_DESTINATIONS = new Set<ConciergeDestination>([
  'meatende',
  'simulador',
  'professor'
])

function handoffMatchesTarget(
  destination: string,
  chatKind: ConversationalChatKind,
  simulatorMode?: string
) {
  if (destination === 'professor') return chatKind === 'PROF'
  if (destination === 'meatende') {
    return chatKind === 'SIMULADOR' && simulatorMode === 'experiencia'
  }
  if (destination === 'simulador') {
    return chatKind === 'SIMULADOR' && simulatorMode === 'terapeuta'
  }
  return false
}

function getHandoffRedirect(destination: ConciergeDestination, handoffId: string) {
  const encoded = encodeURIComponent(handoffId)
  if (destination === 'meatende') {
    return `/simulador/chat?mode=experiencia&handoff=${encoded}`
  }
  if (destination === 'simulador') {
    return `/simulador/chat?mode=terapeuta&handoff=${encoded}`
  }
  if (destination === 'professor') return `/prof?handoff=${encoded}`
  return null
}

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
  let message = rawMessage.trim()
  const handoffId = typeof body?.handoffId === 'string' ? body.handoffId.trim() : ''
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
  const conciergeEntryRaw =
    typeof body?.conciergeEntryPoint === 'string'
      ? body.conciergeEntryPoint
      : 'free'
  const conciergeEntryPoint: ConciergeEntryPoint = [
    'free',
    'pain',
    'talk',
    'research'
  ].includes(conciergeEntryRaw)
    ? (conciergeEntryRaw as ConciergeEntryPoint)
    : 'free'

  if (!isConversationalChatKind(chatKindRaw)) {
    return NextResponse.json({ error: 'chatKind inválido' }, { status: 400 })
  }

  const chatKind = chatKindRaw as ConversationalChatKind

  if (chatKind === 'SEARCH' && !agent) {
    return NextResponse.json({ error: 'agent inválido' }, { status: 400 })
  }

  const hasPremium = await isUserPremium(userId)
  const isPublicGuidedExperience =
    chatKind === 'SIMULADOR' && simulatorMode === 'experiencia'
  if (chatKind !== 'SEARCH' && !isPublicGuidedExperience && !hasPremium) {
    return NextResponse.json(
      { error: 'Recurso disponível apenas para assinantes premium' },
      { status: 403 }
    )
  }

  try {
    const handoff = handoffId
      ? await prisma.chatHandoff.findFirst({
          where: { id: handoffId, userId },
          select: {
            id: true,
            destination: true,
            contextSummary: true,
            expiresAt: true,
            consumedAt: true
          }
        })
      : null

    if (handoffId) {
      if (!handoff) {
        return NextResponse.json({ error: 'Encaminhamento não encontrado' }, { status: 404 })
      }
      if (handoff.consumedAt || handoff.expiresAt <= new Date()) {
        return NextResponse.json({ error: 'Encaminhamento expirado ou já utilizado' }, { status: 410 })
      }
      if (!handoffMatchesTarget(handoff.destination, chatKind, simulatorMode)) {
        return NextResponse.json({ error: 'Destino do encaminhamento incompatível' }, { status: 409 })
      }
      message = handoff.contextSummary
    }

    if (!message) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
    }

    let threadId = existingThreadId
    let chatSessionId: string
    let currentSession: Awaited<ReturnType<typeof getChatSessionForUser>> = null

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
      currentSession = existing
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

      if (chatKind === 'SEARCH' && agent) {
        await saveChatMessage({
          chatSessionId,
          role: 'ASSISTANT',
          content:
            agent === 'concierge'
              ? getConciergeEntryMessage(conciergeEntryPoint)
              : getAgentWelcomeMessage(agent)
        })
      }
    }

    await saveChatMessage({
      chatSessionId,
      role: 'USER',
      content: message
    })

    const assistantResponse = await requestConversationalResponse({
      threadId,
      userId,
      message,
      language,
      chatKind,
      agent,
      simulatorMode,
      routingState:
        agent === 'concierge'
          ? {
              status: currentSession?.routingStatus,
              destination: currentSession?.routingDestination,
              intentSummary: currentSession?.routingIntentSummary,
              questionCount: currentSession?.routingQuestionCount ?? 0
            }
          : undefined,
      conciergeEntryPoint:
        agent === 'concierge' ? conciergeEntryPoint : undefined
    })

    let resolvedAgent = agent
    let redirectTo: string | null = null
    let createdHandoffId: string | null = null
    const responseMessages = [...assistantResponse.messages]

    if (agent === 'concierge') {
      const routing = assistantResponse.routing
      if (!routing) {
        throw new Error('Webhook do porteiro não retornou estado de roteamento')
      }

      const questionCount = Math.max(
        currentSession?.routingQuestionCount ?? 0,
        routing.clarificationCount
      )
      const isConfirmedRoute =
        routing.shouldRoute &&
        routing.status === 'ready_to_route' &&
        !routing.requiresConfirmation &&
        routing.suggestedDestination !== 'indefinido'

      if (routing.shouldRoute && !isConfirmedRoute) {
        throw new Error('Webhook do porteiro tentou encaminhar sem confirmação válida')
      }
      if (
        !routing.shouldRoute &&
        questionCount >= 3 &&
        routing.status !== 'needs_selection' &&
        routing.status !== 'awaiting_confirmation'
      ) {
        throw new Error('Webhook do porteiro excedeu o limite de perguntas')
      }

      await prisma.chatSession.update({
        where: { id: chatSessionId },
        data: {
          routingStatus: routing.status,
          routingDestination: routing.suggestedDestination,
          routingIntentSummary: routing.intentSummary,
          routingQuestionCount: questionCount
        }
      })

      if (isConfirmedRoute) {
        const specialist = destinationToSpecialist(routing.suggestedDestination)
        const handoffMessage =
          routing.handoffMessage || routing.intentSummary || message

        if (specialist) {
          resolvedAgent = specialist
          await prisma.chatSession.update({
            where: { id: chatSessionId },
            data: { agent: specialist }
          })

          const specialistResponse = await requestConversationalResponse({
            threadId,
            userId,
            message: handoffMessage,
            language,
            chatKind,
            agent: specialist
          })
          responseMessages.push(...specialistResponse.messages)
        } else if (EXTERNAL_DESTINATIONS.has(routing.suggestedDestination)) {
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
          const createdHandoff = await prisma.chatHandoff.create({
            data: {
              userId,
              sourceSessionId: chatSessionId,
              destination: routing.suggestedDestination,
              contextSummary: handoffMessage,
              expiresAt
            },
            select: { id: true }
          })
          createdHandoffId = createdHandoff.id
          redirectTo = getHandoffRedirect(
            routing.suggestedDestination,
            createdHandoff.id
          )
        }
      }
    }

    const newMessages = []
    for (const assistantMessage of responseMessages) {
      const saved = await saveChatMessage({
        chatSessionId,
        role: 'ASSISTANT',
        content: assistantMessage.content
      })
      newMessages.push(saved)
    }

    if (handoff) {
      await prisma.chatHandoff.update({
        where: { id: handoff.id },
        data: { consumedAt: new Date(), targetThreadId: threadId }
      })
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
      agent: resolvedAgent,
      messages,
      newMessages,
      responseStatus: assistantResponse.status,
      action: assistantResponse.action,
      routing: assistantResponse.routing,
      redirectTo,
      handoffId: createdHandoffId,
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

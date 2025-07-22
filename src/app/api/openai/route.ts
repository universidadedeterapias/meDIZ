// app/api/openai/route.ts
import { auth } from '@/auth'
import {
  addMessageToThread,
  createThread,
  getMessages,
  runAssistant,
  waitForRunCompletion
} from '@/lib/assistant'
import { createChatSessionWithThread } from '@/lib/chatService'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const userId = session.user.id
  const { message } = await req.json()

  // ── 1) Verifica limite de sessões hoje ─────────────────────────────
  // Início do dia (00:00)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Conta quantas ChatSession o usuário já criou hoje
  const todayCount = await prisma.chatSession.count({
    where: {
      userId,
      createdAt: { gte: startOfDay }
    }
  })

  // ── 2) Verifica assinatura ativa ──────────────────────────────────
  const hasActiveSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      currentPeriodEnd: { gte: new Date() }
    }
  })

  // ── 3) Se não tiver assinatura E já fez ≥3 buscas, bloqueia ──────
  if (!hasActiveSubscription && todayCount >= 3) {
    return NextResponse.json({ limitReached: true }, { status: 403 })
  }

  try {
    // ── 4) Cria thread e registra ChatSession ────────────────────────
    const threadId = await createThread()
    await createChatSessionWithThread(userId, threadId)

    // ── 5) Envia a mensagem ao assistant e aguarda resposta ──────────
    await addMessageToThread(threadId, message)
    const runId = await runAssistant(threadId, ASSISTANT_ID)
    await waitForRunCompletion(threadId, runId)

    // ── 6) Busca as mensagens geradas e retorna ao cliente ───────────
    const responses = await getMessages(threadId)
    return NextResponse.json({ responses, threadId })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro ao processar assistant' },
      { status: 500 }
    )
  }
}

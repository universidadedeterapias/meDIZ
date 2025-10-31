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
import { getUserLimits, getUserPeriod } from '@/lib/userPeriod'
import { NextResponse } from 'next/server'

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!

// Configuração para aumentar timeout da função no Vercel (requer plano Pro)
export const config = {
  maxDuration: 60 // 60 segundos (máximo para Serverless Function no plano Pro)
}

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
      status: {
        in: ['active', 'ACTIVE', 'cancel_at_period_end']
      },
      currentPeriodEnd: {
        gte: new Date()
      }
    },
    select: {
      id: true // Só seleciona o ID para verificar existência
    }
  })

  // ── 3) Se não tiver assinatura, aplica regras do plano gratuito ──────
  if (!hasActiveSubscription) {
    // Busca informações do usuário para saber a data de cadastro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }
    
    // Determina o período e limites do usuário
    const userPeriod = getUserPeriod(user.createdAt)
    const { searchLimit } = getUserLimits(userPeriod)
    
    // Verifica se excedeu o limite baseado no período
    if (todayCount >= searchLimit) {
      return NextResponse.json({ 
        limitReached: true,
        period: userPeriod,
        searchLimit
      }, { status: 403 })
    }
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
    
    // ── 7) Se não tiver assinatura, inclui informações do período na resposta ───
    if (!hasActiveSubscription) {
      // Busca informações do usuário para determinar o período
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
          userPeriod,
          fullVisualization,
          shouldShowPopup: true // Flag para indicar que deve mostrar o popup
        })
      }
    }
    
    return NextResponse.json({ responses, threadId })
  } catch (err) {
    console.error('[API OpenAI] Erro:', err)
    return NextResponse.json(
      { error: 'Erro ao processar assistant' },
      { status: 500 }
    )
  }
}

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

// Configuração de timeout para Next.js 15
// Usa ambas as sintaxes para garantir compatibilidade máxima
export const maxDuration = 300 // 5 minutos (para planos Pro do Vercel)
export const runtime = 'nodejs' // Garante uso do runtime Node.js

// Sintaxe alternativa para compatibilidade (se maxDuration direto não funcionar)
export const config = {
  maxDuration: 300, // 5 minutos
  runtime: 'nodejs' as const
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

  const startTime = Date.now()
  
  try {
    console.log(`[API OpenAI] 🚀 Iniciando processamento para usuário ${userId}`)
    
    // ── 4) Cria thread e registra ChatSession ────────────────────────
    const threadStart = Date.now()
    const threadId = await createThread()
    await createChatSessionWithThread(userId, threadId)
    console.log(`[API OpenAI] ✅ Thread criada em ${Date.now() - threadStart}ms: ${threadId}`)

    // ── 5) Envia a mensagem ao assistant e aguarda resposta ──────────
    const runStart = Date.now()
    await addMessageToThread(threadId, message)
    const runId = await runAssistant(threadId, ASSISTANT_ID)
    console.log(`[API OpenAI] 🔄 Run iniciado em ${Date.now() - runStart}ms: ${runId}`)
    
    await waitForRunCompletion(threadId, runId)
    const runDuration = Date.now() - runStart
    console.log(`[API OpenAI] ✅ Run completado em ${runDuration}ms`)

    // ── 6) Busca as mensagens geradas e retorna ao cliente ───────────
    const messagesStart = Date.now()
    const responses = await getMessages(threadId)
    console.log(`[API OpenAI] 📨 Mensagens obtidas em ${Date.now() - messagesStart}ms`)
    
    const totalDuration = Date.now() - startTime
    console.log(`[API OpenAI] ✅ Processamento completo em ${totalDuration}ms`)
    
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
    const duration = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : String(err)
    const isTimeout = errorMessage.includes('Timeout') || 
                     errorMessage.includes('504') ||
                     errorMessage.includes('FUNCTION_INVOCATION_TIMEOUT') ||
                     duration >= 290000 // Próximo do limite de 5 minutos
    
    console.error(`[API OpenAI] ❌ Erro após ${duration}ms:`, {
      error: errorMessage,
      isTimeout,
      threadId: err instanceof Error ? err.stack : undefined
    })
    
    // Retorna erro específico para timeout
    if (isTimeout) {
      return NextResponse.json(
        { 
          error: 'A consulta está demorando mais do que o esperado. Por favor, tente novamente com uma pergunta mais específica.',
          timeout: true,
          duration
        },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar sua consulta. Por favor, tente novamente.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

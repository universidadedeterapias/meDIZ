// lib/assistant.ts
import { OpenAIMessage } from '@/types/openaiMessage'
import { openaiRequest } from './openai'

type ThreadMessages = {
  assistant: string[]
  user: string[]
}

export async function createThread() {
  const res = await openaiRequest<{ id: string }>('threads', { method: 'POST' })
  return res.id
}

export async function addMessageToThread(threadId: string, content: string) {
  await openaiRequest(`threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content })
  })
}

export async function runAssistant(threadId: string, assistantId: string) {
  const res = await openaiRequest<{ id: string }>(`threads/${threadId}/runs`, {
    method: 'POST',
    body: JSON.stringify({ assistant_id: assistantId })
  })
  return res.id
}

export async function waitForRunCompletion(threadId: string, runId: string) {
  // Timeout baseado em tempo real (270s = 4min30s) para dar margem antes do timeout do Vercel (5min)
  const maxDurationMs = 270000 // 4 minutos e 30 segundos
  const startTime = Date.now()
  let attempts = 0
  
  console.log(`[Assistant] 🔄 Aguardando conclusão do run ${runId} (máximo ${maxDurationMs / 1000}s)`)
  
  while (Date.now() - startTime < maxDurationMs) {
    const res = await openaiRequest<{ status: string; last_error?: { message: string } }>(
      `threads/${threadId}/runs/${runId}`,
      {
        method: 'GET'
      }
    )
    
    if (res.status === 'completed') {
      const duration = Date.now() - startTime
      console.log(`[Assistant] ✅ Run completado em ${duration}ms (${attempts + 1} tentativas)`)
      return
    }
    
    if (res.status === 'failed' || res.status === 'cancelled') {
      const errorMsg = res.last_error?.message || 'Unknown error'
      console.error(`[Assistant] ❌ Run falhou: ${res.status} - ${errorMsg}`)
      throw new Error(`Run falhou com status: ${res.status}. ${errorMsg}`)
    }
    
    if (res.status === 'expired') {
      console.error(`[Assistant] ❌ Run expirado após ${attempts + 1} tentativas`)
      throw new Error('Run expirou na OpenAI. A consulta demorou muito para processar.')
    }
    
    attempts++
    
    // Exponential backoff: 1s → 2s → 4s → 8s → max 15s
    // Isso reduz carga na API e dá mais tempo para processar
    let delay: number
    const elapsedSeconds = (Date.now() - startTime) / 1000
    
    if (elapsedSeconds < 10) {
      delay = 1000 // Primeiros 10s: polling a cada 1s
    } else if (elapsedSeconds < 30) {
      delay = 2000 // 10-30s: polling a cada 2s
    } else if (elapsedSeconds < 60) {
      delay = 4000 // 30-60s: polling a cada 4s
    } else if (elapsedSeconds < 120) {
      delay = 8000 // 60-120s: polling a cada 8s
    } else {
      delay = 15000 // Após 120s: polling a cada 15s (máximo)
    }
    
    await new Promise(r => setTimeout(r, delay))
    
    // Log de progresso a cada 30 segundos
    if (attempts % 5 === 0 || elapsedSeconds % 30 < 2) {
      const elapsed = Math.floor(elapsedSeconds)
      const remaining = Math.floor((maxDurationMs - (Date.now() - startTime)) / 1000)
      console.log(`[Assistant] ⏳ Aguardando... ${elapsed}s decorridos, ~${remaining}s restantes`)
    }
  }
  
  const duration = Date.now() - startTime
  console.error(`[Assistant] ⏰ Timeout: Run não completou em ${duration}ms (${attempts} tentativas)`)
  throw new Error(`Timeout: Run não completou em ${duration / 1000} segundos`)
}

export async function getMessages(threadId: string): Promise<ThreadMessages> {
  const res = await openaiRequest<{ data: OpenAIMessage[] }>(
    `threads/${threadId}/messages`,
    { method: 'GET' }
  )

  return res.data.reduce<ThreadMessages>(
    (acc, msg) => {
      // extrai texto com fallback vazio
      const text = msg.content?.[0]?.text?.value ?? ''

      if (msg.role === 'assistant') {
        acc.assistant.push(text)
      } else if (msg.role === 'user') {
        acc.user.push(text)
      }
      return acc
    },
    { assistant: [], user: [] }
  )
}

export async function getUserMessages(threadId: string) {
  const res = await openaiRequest<{ data: OpenAIMessage[] }>(
    `threads/${threadId}/messages`,
    {
      method: 'GET'
    }
  )
  return res.data
    .filter(m => m.role === 'user')
    .map(m => m.content?.[0]?.text?.value ?? '')
}

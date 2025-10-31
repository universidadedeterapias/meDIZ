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
  const startTime = Date.now()
  const maxAttempts = 50 // Reduzido para 50 tentativas (com exponential backoff, isso dá ~55-60s máximo)
  let attempts = 0
  let delay = 500 // Começa com 500ms
  
  while (attempts < maxAttempts) {
    const res = await openaiRequest<{ status: string }>(
      `threads/${threadId}/runs/${runId}`,
      {
        method: 'GET'
      }
    )
    
    if (res.status === 'completed') {
      return
    }
    
    if (res.status === 'failed' || res.status === 'cancelled') {
      throw new Error(`Run falhou com status: ${res.status}`)
    }
    
    // Verifica se excedeu o tempo máximo (55s para dar margem de 5s para outros processos)
    const elapsed = Date.now() - startTime
    if (elapsed > 55000) {
      throw new Error(`Timeout: Run não completou em 55 segundos`)
    }
    
    attempts++
    
    // Exponential backoff: 500ms, 1s, 1.5s, 2s, 2.5s, 3s, ... até 10s máximo
    // Isso reduz o número de requisições e o tempo total
    await new Promise(r => setTimeout(r, delay))
    
    // Aumenta delay progressivamente, mas com limite máximo
    if (attempts < 5) {
      delay = 500 // Primeiros 5: 500ms
    } else if (attempts < 15) {
      delay = 1000 // Próximos 10: 1s
    } else if (attempts < 30) {
      delay = 2000 // Próximos 15: 2s
    } else {
      delay = Math.min(3000, delay + 500) // Depois: 3s com crescimento até 10s
    }
  }
  
  const totalTime = Date.now() - startTime
  throw new Error(`Timeout: Run não completou em ${Math.round(totalTime / 1000)} segundos`)
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

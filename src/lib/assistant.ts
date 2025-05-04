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
  while (true) {
    const res = await openaiRequest<{ status: string }>(
      `threads/${threadId}/runs/${runId}`,
      {
        method: 'GET'
      }
    )
    if (res.status === 'completed') break
    await new Promise(r => setTimeout(r, 1000))
  }
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

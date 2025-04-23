// lib/assistant.ts
import { OpenAIMessage } from '@/types/openaiMessage'
import { openaiRequest } from './openai'

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

export async function getMessages(threadId: string) {
  const res = await openaiRequest<{ data: OpenAIMessage[] }>(
    `threads/${threadId}/messages`,
    {
      method: 'GET'
    }
  )
  return res.data.map(m => m.content?.[0]?.text?.value ?? '')
}

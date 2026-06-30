import { z } from 'zod'

const assistantMessageSchema = z.object({
  type: z.literal('text'),
  content: z.string().trim().min(1).max(4000)
})

const assistantActionSchema = z.object({
  type: z.enum(['share', 'none']),
  label: z.string().trim().min(1).max(120).optional()
})

const structuredResponseSchema = z.object({
  version: z.literal('2.0'),
  agent: z.enum(['body', 'home', 'pet']).optional(),
  status: z.enum(['completed', 'awaiting_confirmation']).default('completed'),
  messages: z.array(assistantMessageSchema).min(1).max(8),
  action: assistantActionSchema.optional()
})

export type N8nAssistantResponse = {
  version: '2.0' | 'legacy'
  agent?: 'body' | 'home' | 'pet'
  status: 'completed' | 'awaiting_confirmation'
  messages: Array<{ type: 'text'; content: string }>
  action?: { type: 'share' | 'none'; label?: string }
}

function normalizeReplyText(text: string): string {
  let normalized = text.trim()

  if (
    normalized.includes('\\n') ||
    normalized.includes('\\r') ||
    normalized.includes('\\t')
  ) {
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

  return normalized
    .trim()
    .replace(/^\n{3,}/g, '\n\n')
    .replace(/\n{3,}$/g, '\n\n')
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function findStructuredResponse(value: unknown, depth = 0): unknown {
  if (depth > 4) return null
  const parsed = tryParseJson(value)
  const direct = structuredResponseSchema.safeParse(parsed)
  if (direct.success) return direct.data

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findStructuredResponse(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const record = parsed as Record<string, unknown>
  for (const key of ['output', 'json', 'data', 'response', 'body']) {
    if (key in record) {
      const found = findStructuredResponse(record[key], depth + 1)
      if (found) return found
    }
  }
  return null
}

function extractTextFromObject(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  for (const key of [
    'resposta',
    'response',
    'message',
    'text',
    'content',
    'output',
    'reply',
    'answer'
  ]) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }

  for (const key of ['json', 'data', 'body']) {
    if (record[key] && typeof record[key] === 'object') {
      const nested = extractTextFromObject(record[key])
      if (nested) return nested
    }
  }
  return null
}

export function parseN8nAssistantReply(
  responseText: string
): N8nAssistantResponse {
  const trimmed = responseText.trim()
  if (!trimmed) {
    throw new Error('Webhook do n8n retornou resposta vazia após processamento')
  }

  const parsed = tryParseJson(trimmed)
  const structured = findStructuredResponse(parsed)
  if (structured) {
    const result = structuredResponseSchema.parse(structured)
    return {
      version: '2.0',
      agent: result.agent,
      status: result.status ?? 'completed',
      messages: result.messages.map((message) => ({
        type: 'text' as const,
        content: normalizeReplyText(message.content)
      })),
      action: result.action?.type
        ? { type: result.action.type, label: result.action.label }
        : undefined
    }
  }

  let legacyText: string | null = null
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      legacyText = extractTextFromObject(item)
      if (legacyText) break
    }
  } else {
    legacyText = extractTextFromObject(parsed)
  }

  const content = normalizeReplyText(legacyText ?? trimmed)
  if (!content) {
    throw new Error('Webhook do n8n retornou resposta vazia após processamento')
  }

  return {
    version: 'legacy',
    status: 'completed',
    messages: [{ type: 'text', content }]
  }
}

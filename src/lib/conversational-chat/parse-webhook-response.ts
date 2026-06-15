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

  normalized = normalized.trim()
  return normalized
    .replace(/^\n{3,}/g, '\n\n')
    .replace(/\n{3,}$/g, '\n\n')
}

function extractTextFromObject(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const keys = [
    'resposta',
    'response',
    'message',
    'text',
    'content',
    'output',
    'reply',
    'answer'
  ]

  for (const key of keys) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }

  if (record.json && typeof record.json === 'object') {
    return extractTextFromObject(record.json)
  }

  if (record.data && typeof record.data === 'object') {
    return extractTextFromObject(record.data)
  }

  return null
}

export function parseN8nAssistantReply(responseText: string): string {
  const trimmed = responseText.trim()
  if (!trimmed) {
    throw new Error('Webhook do n8n retornou resposta vazia após processamento')
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)

    if (typeof parsed === 'string' && parsed.trim()) {
      return normalizeReplyText(parsed)
    }

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const text = extractTextFromObject(item)
        if (text) return normalizeReplyText(text)
      }
    }

    const fromObject = extractTextFromObject(parsed)
    if (fromObject) {
      return normalizeReplyText(fromObject)
    }
  } catch {
    // resposta em texto puro
  }

  return normalizeReplyText(trimmed)
}

import {
  DEFAULT_LANGUAGE,
  getLanguageMapping,
  isSupportedLanguage,
  type LanguageCode
} from '@/i18n/config'
import { withRetryAndCircuitBreaker, isRetryableError } from '@/lib/retry'
import type { ConversationalChatKind } from '@/lib/conversational-chat/config'
import { getConversationalWebhookUrl } from '@/lib/conversational-chat/config'
import { parseN8nAssistantReply } from '@/lib/conversational-chat/parse-webhook-response'

const WEBHOOK_TIMEOUT_MS = 90_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function requestConversationalResponse(input: {
  threadId: string
  message: string
  language: LanguageCode
  chatKind: ConversationalChatKind
}): Promise<string> {
  const langMapping = getLanguageMapping(input.language)
  let messageWithLanguage = input.message

  if (input.language !== 'pt-BR' && input.language !== 'pt-PT') {
    const languageTag =
      input.language === 'en'
        ? '[english]'
        : input.language === 'es'
          ? '[espanol]'
          : `[${input.language}]`
    messageWithLanguage = `${languageTag} ${input.message}`
  }

  const payload = {
    threadId: input.threadId,
    message: messageWithLanguage,
    messageOriginal: input.message,
    sintoma: messageWithLanguage,
    sintomaOriginal: input.message,
    chatKind: input.chatKind.toLowerCase(),
    mode: input.chatKind.toLowerCase(),
    language: input.language,
    lang: langMapping.iso6391,
    locale: input.language,
    idioma: langMapping.namePortuguese,
    idiomaResposta: langMapping.nameNative,
    responderEm: langMapping.nameNative,
    iso6391: langMapping.iso6391,
    iso6392: langMapping.iso6392,
    instrucaoIdioma: langMapping.instruction,
    languageInstruction: langMapping.instruction,
    languageName: langMapping.nameEnglish,
    nomeIdioma: langMapping.namePortuguese
  }

  const webhookUrl = getConversationalWebhookUrl(input.chatKind)

  const response = await withRetryAndCircuitBreaker(
    `n8n-${input.chatKind.toLowerCase()}`,
    async () => {
      const res = await fetchWithTimeout(
        webhookUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        },
        WEBHOOK_TIMEOUT_MS
      )

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        const error = new Error(
          `Webhook retornou ${res.status} - ${res.statusText}${errorText ? ` - ${errorText}` : ''}`
        )
        ;(error as { status?: number }).status = res.status
        throw error
      }

      return res
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 5000,
      shouldRetry: (error) => isRetryableError(error)
    }
  )

  const responseText = await response.text()
  return parseN8nAssistantReply(responseText)
}

export function resolveRequestLanguage(
  requestedLanguage: string | undefined
): LanguageCode {
  return isSupportedLanguage(requestedLanguage)
    ? requestedLanguage
    : DEFAULT_LANGUAGE
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTranscribeWebhookUrl } from '@/lib/conversational-chat/config'
import { getAudioFileExtension, MAX_AUDIO_UPLOAD_BYTES } from '@/lib/conversational-chat/audio'
import { withRetryAndCircuitBreaker, isRetryableError } from '@/lib/retry'

export const dynamic = 'force-dynamic'

const TRANSCRIBE_TIMEOUT_MS = 30_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let incomingForm: FormData
  try {
    incomingForm = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  const audio = incomingForm.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Áudio ausente' }, { status: 400 })
  }
  if (audio.size > MAX_AUDIO_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Áudio muito grande' }, { status: 413 })
  }

  const webhookUrl = getTranscribeWebhookUrl()
  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'Transcrição não configurada' },
      { status: 503 }
    )
  }

  const outgoingForm = new FormData()
  const extension = getAudioFileExtension(audio.type || 'audio/webm')
  outgoingForm.append('data', audio, `recording.${extension}`)

  try {
    const response = await withRetryAndCircuitBreaker(
      'n8n-transcribe',
      async () => {
        const res = await fetchWithTimeout(
          webhookUrl,
          { method: 'POST', body: outgoingForm },
          TRANSCRIBE_TIMEOUT_MS
        )

        if (!res.ok) {
          const errorText = await res.text().catch(() => '')
          const error = new Error(
            `Webhook de transcrição retornou ${res.status}${errorText ? ` - ${errorText}` : ''}`
          )
          ;(error as { status?: number }).status = res.status
          throw error
        }

        return res
      },
      {
        maxAttempts: 2,
        initialDelay: 500,
        backoffMultiplier: 2,
        maxDelay: 2000,
        shouldRetry: (error) => isRetryableError(error)
      }
    )

    const data = await response.json().catch(() => null)
    const transcript =
      typeof data?.transcript === 'string' ? data.transcript.trim() : ''

    if (!transcript) {
      return NextResponse.json(
        { error: 'Não foi possível transcrever o áudio' },
        { status: 502 }
      )
    }

    return NextResponse.json({ transcript })
  } catch (err) {
    console.error('[conversational-chat/transcribe] POST error:', err)
    return NextResponse.json(
      { error: 'Erro ao transcrever áudio. Tente novamente.' },
      { status: 502 }
    )
  }
}

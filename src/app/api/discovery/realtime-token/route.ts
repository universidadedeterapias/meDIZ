import { auth } from '@/auth'
import { shouldRunDiscovery } from '@/lib/discovery-access'
import { getActiveDiscoverySystemPrompt } from '@/lib/discovery-prompt-config'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const REALTIME_MODEL = process.env.DISCOVERY_REALTIME_MODEL ?? 'gpt-realtime'
const REALTIME_VOICE = process.env.DISCOVERY_REALTIME_VOICE ?? 'alloy'
const TRANSCRIPTION_MODEL = process.env.DISCOVERY_TRANSCRIPTION_MODEL ?? 'gpt-4o-transcribe'

export const dynamic = 'force-dynamic'

/**
 * Gera um client secret efemero para a sessao de descoberta via OpenAI Realtime.
 * Excecao deliberada ao padrao do app de centralizar chamadas a provedores de IA no n8n —
 * uma sessao de voz ao vivo (WebRTC) nao e compativel com o modelo de webhook do n8n.
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        createdAt: true,
        userProfile: {
          select: {
            discoveryCompleted: true,
            consentedAt: true
          }
        }
      }
    })

    if (
      !user ||
      !shouldRunDiscovery({
        userCreatedAt: user.createdAt,
        discoveryCompleted: user.userProfile?.discoveryCompleted
      })
    ) {
      return NextResponse.json({ error: 'Descoberta indisponível ou já concluída' }, { status: 409 })
    }

    if (!user.userProfile?.consentedAt) {
      return NextResponse.json({ error: 'Consentimento obrigatório antes da descoberta' }, { status: 403 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('[Discovery Realtime Token] OPENAI_API_KEY não configurada')
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const systemPrompt = await getActiveDiscoverySystemPrompt()

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 600 },
        session: {
          type: 'realtime',
          model: REALTIME_MODEL,
          instructions: systemPrompt,
          output_modalities: ['audio'],
          audio: {
            input: {
              transcription: {
                model: TRANSCRIPTION_MODEL,
                language: 'pt',
                prompt:
                  'Conversa em português do Brasil. Preserve nomes próprios exatamente como forem falados.'
              },
              turn_detection: {
                type: 'server_vad',
                create_response: false,
                interrupt_response: false,
                silence_duration_ms: 1500
              }
            },
            output: { voice: REALTIME_VOICE }
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: { message?: string; error?: { message?: string } }
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { message: errorText }
      }

      console.error('[Discovery Realtime Token] Erro ao criar client secret:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })

      return NextResponse.json(
        {
          error: 'Erro ao criar sessão Real-Time',
          details:
            process.env.NODE_ENV === 'development'
              ? errorData.message || errorData.error?.message || errorText
              : undefined,
          status: response.status
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const clientSecret = data.value ?? data.client_secret?.value

    if (!clientSecret) {
      return NextResponse.json({ error: 'Client secret não retornado pela OpenAI' }, { status: 502 })
    }

    return NextResponse.json({
      clientSecret,
      sessionId: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      transcriptionModel: TRANSCRIPTION_MODEL,
      instructions: systemPrompt
    })
  } catch (error) {
    console.error('[Discovery Realtime Token] Erro completo:', error)
    return NextResponse.json(
      {
        error: 'Erro ao gerar token',
        details:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined
      },
      { status: 500 }
    )
  }
}

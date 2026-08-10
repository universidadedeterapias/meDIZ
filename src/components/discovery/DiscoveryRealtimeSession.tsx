'use client'

import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeItem,
  RealtimeSession,
  tool
} from '@openai/agents/realtime'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { z } from 'zod'

export type DiscoveryRealtimeHistoryMessage = {
  itemId: string
  previousItemId?: string | null
  role: 'user' | 'assistant'
  text: string
  channel: 'voice' | 'text'
}

export type DiscoveryRealtimeUsage = {
  responseId?: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputTextTokens: number
  inputAudioTokens: number
  outputTextTokens: number
  outputAudioTokens: number
}

export type DiscoveryRealtimeSessionHandle = {
  sendText: (text: string) => void
  interrupt: () => void
  requestResponse: (modalities?: ('text' | 'audio')[]) => void
  /** Tenta reproduzir o áudio novamente após um gesto do usuário (fallback de autoplay bloqueado). */
  resumeAudio: () => void
}

type DiscoveryRealtimeSessionProps = {
  clientSecret: string
  sessionId: string
  model: string
  transcriptionModel: string
  instructions: string
  muted: boolean
  onTranscript: (text: string, role: 'user' | 'assistant', itemId?: string) => void
  onHistoryUpdated?: (messages: DiscoveryRealtimeHistoryMessage[]) => void
  onUsage?: (usage: DiscoveryRealtimeUsage) => void
  onInputVolume?: (volume: number) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError: (error: Error) => void
  /** Chamado quando `audioElement.play()` e bloqueado pelo navegador (autoplay). */
  onAudioBlocked?: () => void
  /**
   * Chamado quando o agente decide que os 4 alvos da descoberta foram capturados (tool-call
   * `finish_discovery`). Substitui a deteccao por fuzzy-match de texto usada na versao original.
   */
  onFinishDiscovery: () => void
}

let activeDiscoverySession: RealtimeSession | null = null

function createDiscoveryAudioElement() {
  const audioElement = document.createElement('audio')
  audioElement.autoplay = true
  audioElement.setAttribute('playsinline', 'true')

  return audioElement
}

function createAudioContext() {
  return new window.AudioContext()
}

function toError(error: unknown) {
  if (error instanceof Error) return error

  try {
    return new Error(JSON.stringify(error))
  } catch {
    return new Error(String(error))
  }
}

function getHistoryMessageText(item: RealtimeItem) {
  if (item.type !== 'message') return null

  for (const content of item.content) {
    if (content.type === 'input_text') return content.text.trim()
    if (content.type === 'input_audio') return content.transcript?.trim() || null
    if (content.type === 'output_text') return content.text.trim()
    if (content.type === 'output_audio') return content.transcript?.trim() || null
  }

  return null
}

function getHistoryMessageChannel(item: RealtimeItem): 'voice' | 'text' {
  if (item.type !== 'message') return 'text'

  return item.content.some(
    (content) => content.type === 'input_audio' || content.type === 'output_audio'
  )
    ? 'voice'
    : 'text'
}

function getPreviousItemId(item: RealtimeItem): string | null {
  return 'previousItemId' in item && typeof item.previousItemId === 'string'
    ? item.previousItemId
    : null
}

function historyToDiscoveryMessages(
  history: RealtimeItem[],
  transcriptByItemId: Map<string, string>,
  itemOrder: Map<string, number>
): DiscoveryRealtimeHistoryMessage[] {
  const orderedHistory = orderRealtimeHistory(history, itemOrder)

  return orderedHistory
    .filter((item) => item.type === 'message' && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      itemId: item.itemId,
      previousItemId: getPreviousItemId(item),
      role: item.role as 'user' | 'assistant',
      text: transcriptByItemId.get(item.itemId) ?? getHistoryMessageText(item) ?? '',
      channel: getHistoryMessageChannel(item)
    }))
    .filter((message) => message.text.length > 0)
}

function orderRealtimeHistory(history: RealtimeItem[], itemOrder: Map<string, number>) {
  return [...history].sort((a, b) => {
    const orderA = itemOrder.get(a.itemId) ?? Number.MAX_SAFE_INTEGER
    const orderB = itemOrder.get(b.itemId) ?? Number.MAX_SAFE_INTEGER

    if (orderA !== orderB) return orderA - orderB
    return 0
  })
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function usageFromTransportEvent(event: unknown): DiscoveryRealtimeUsage | null {
  const eventRecord = getRecord(event)
  if (eventRecord.type !== 'response.done') return null

  const response = getRecord(eventRecord.response)
  const usage = getRecord(response.usage)
  const inputDetails = getRecord(usage.input_token_details)
  const outputDetails = getRecord(usage.output_token_details)
  const inputTokens = getNumber(usage.input_tokens)
  const outputTokens = getNumber(usage.output_tokens)

  return {
    responseId: typeof response.id === 'string' ? response.id : undefined,
    inputTokens,
    outputTokens,
    totalTokens: getNumber(usage.total_tokens) || inputTokens + outputTokens,
    inputTextTokens: getNumber(inputDetails.text_tokens),
    inputAudioTokens: getNumber(inputDetails.audio_tokens),
    outputTextTokens: getNumber(outputDetails.text_tokens),
    outputAudioTokens: getNumber(outputDetails.audio_tokens)
  }
}

export const DiscoveryRealtimeSession = forwardRef<
  DiscoveryRealtimeSessionHandle,
  DiscoveryRealtimeSessionProps
>(function DiscoveryRealtimeSession(
  {
    clientSecret,
    sessionId: _sessionId,
    model,
    transcriptionModel,
    instructions,
    muted,
    onTranscript,
    onHistoryUpdated,
    onUsage,
    onInputVolume,
    onConnected,
    onDisconnected,
    onError,
    onAudioBlocked,
    onFinishDiscovery
  }: DiscoveryRealtimeSessionProps,
  ref
) {
  const connectedRef = useRef(false)
  const connectingRef = useRef(false)
  const mountedRef = useRef(true)
  const sessionRef = useRef<RealtimeSession | null>(null)
  const audioElementRef = useRef<ReturnType<typeof createDiscoveryAudioElement> | null>(null)
  const audioContextRef = useRef<ReturnType<typeof createAudioContext> | null>(null)
  const volumeFrameRef = useRef<number | null>(null)
  const seenEventsRef = useRef<Set<string>>(new Set())
  const transcriptByItemIdRef = useRef<Map<string, string>>(new Map())
  const itemOrderRef = useRef<Map<string, number>>(new Map())
  const nextItemOrderRef = useRef(0)
  const mutedRef = useRef(muted)
  const onTranscriptRef = useRef(onTranscript)
  const onHistoryUpdatedRef = useRef(onHistoryUpdated)
  const onUsageRef = useRef(onUsage)
  const onInputVolumeRef = useRef(onInputVolume)
  const onConnectedRef = useRef(onConnected)
  const onDisconnectedRef = useRef(onDisconnected)
  const onErrorRef = useRef(onError)
  const onAudioBlockedRef = useRef(onAudioBlocked)
  const onFinishDiscoveryRef = useRef(onFinishDiscovery)

  useEffect(() => {
    mutedRef.current = muted
    onTranscriptRef.current = onTranscript
    onHistoryUpdatedRef.current = onHistoryUpdated
    onUsageRef.current = onUsage
    onInputVolumeRef.current = onInputVolume
    onConnectedRef.current = onConnected
    onDisconnectedRef.current = onDisconnected
    onErrorRef.current = onError
    onAudioBlockedRef.current = onAudioBlocked
    onFinishDiscoveryRef.current = onFinishDiscovery
  }, [
    muted,
    onTranscript,
    onHistoryUpdated,
    onUsage,
    onInputVolume,
    onConnected,
    onDisconnected,
    onError,
    onAudioBlocked,
    onFinishDiscovery
  ])

  const disconnect = useCallback(() => {
    if (volumeFrameRef.current !== null) {
      window.cancelAnimationFrame(volumeFrameRef.current)
      volumeFrameRef.current = null
    }

    audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    onInputVolumeRef.current?.(0)

    if (sessionRef.current) {
      try {
        if (activeDiscoverySession === sessionRef.current) {
          activeDiscoverySession = null
        }
        sessionRef.current.close()
      } catch {
        // Sessao pode ja estar encerrada.
      }
    }

    sessionRef.current = null
    connectingRef.current = false
    connectedRef.current = false
    onDisconnectedRef.current?.()
  }, [])

  const connect = useCallback(async () => {
    if (connectingRef.current || connectedRef.current) return

    if (activeDiscoverySession) {
      try {
        activeDiscoverySession.close()
      } catch {
        // Ignora sessao antiga.
      }
      activeDiscoverySession = null
    }

    connectingRef.current = true
    seenEventsRef.current = new Set()
    transcriptByItemIdRef.current = new Map()
    itemOrderRef.current = new Map()
    nextItemOrderRef.current = 0

    try {
      const audioElement = audioElementRef.current ?? createDiscoveryAudioElement()
      audioElementRef.current = audioElement
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      const audioContext = createAudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      audioContext.createMediaStreamSource(mediaStream).connect(analyser)
      audioContextRef.current = audioContext

      const samples = new Uint8Array(analyser.fftSize)
      const reportVolume = () => {
        analyser.getByteTimeDomainData(samples)
        const squareSum = samples.reduce((sum, sample) => {
          const normalized = (sample - 128) / 128
          return sum + normalized * normalized
        }, 0)
        const rms = Math.sqrt(squareSum / samples.length)
        onInputVolumeRef.current?.(Math.min(1, rms * 4))
        volumeFrameRef.current = window.requestAnimationFrame(reportVolume)
      }
      reportVolume()

      const finishDiscoveryTool = tool({
        name: 'finish_discovery',
        description:
          'Chame esta funcao assim que os 4 alvos (nome, contexto, estilo, nucleo) tiverem sido ' +
          'capturados e voce ja tiver dito a frase de encerramento. Nunca chame antes disso, e ' +
          'nunca chame mais de uma vez.',
        parameters: z.object({}),
        execute: async () => {
          onFinishDiscoveryRef.current()
          return 'ok'
        }
      })

      const agent = new RealtimeAgent({
        name: 'meDIZ Descoberta',
        instructions,
        voice: 'alloy',
        tools: [finishDiscoveryTool]
      })

      const session = new RealtimeSession(agent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          mediaStream
        }),
        config: {
          outputModalities: ['audio'],
          audio: {
            input: {
              transcription: {
                model: transcriptionModel,
                language: 'pt',
                prompt:
                  'Conversa em português do Brasil. Preserve nomes próprios exatamente como forem falados.'
              },
              turnDetection: {
                type: 'server_vad',
                createResponse: false,
                interruptResponse: false,
                silenceDurationMs: 1500
              }
            },
            output: {
              voice: 'alloy'
            }
          }
        }
      })
      sessionRef.current = session

      session.on(
        'transport_event',
        (event: {
          type?: string
          transcript?: string
          item_id?: string
          response_id?: string
          event_id?: string
          content_index?: number
        }) => {
          const usage = usageFromTransportEvent(event)
          if (usage) {
            onUsageRef.current?.(usage)
          }

          const transcript = event.transcript?.trim()
          if (!transcript) return

          const eventId =
            event.event_id ??
            `${event.type ?? 'event'}:${event.response_id ?? ''}:${event.item_id ?? ''}:${event.content_index ?? 0}:${transcript.slice(0, 32)}`

          if (seenEventsRef.current.has(eventId)) return
          seenEventsRef.current.add(eventId)

          if (
            event.item_id &&
            (event.type === 'conversation.item.input_audio_transcription.completed' ||
              event.type === 'response.output_audio_transcript.done')
          ) {
            transcriptByItemIdRef.current.set(event.item_id, transcript)
          }

          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            onTranscriptRef.current(transcript, 'user', event.item_id)
          }

          if (event.type === 'response.output_audio_transcript.done') {
            onTranscriptRef.current(transcript, 'assistant', event.item_id)
          }
        }
      )

      session.on('error', (error) => {
        onErrorRef.current(toError(error))
      })

      session.on('history_updated', (history) => {
        for (const item of history) {
          if (!itemOrderRef.current.has(item.itemId)) {
            itemOrderRef.current.set(item.itemId, nextItemOrderRef.current)
            nextItemOrderRef.current += 1
          }
        }

        const historyMessages = historyToDiscoveryMessages(
          history,
          transcriptByItemIdRef.current,
          itemOrderRef.current
        )
        onHistoryUpdatedRef.current?.(historyMessages)
      })

      await session.connect({
        apiKey: clientSecret,
        model
      })

      if (!mountedRef.current) {
        session.close()
        return
      }

      activeDiscoverySession = session
      session.mute(mutedRef.current)
      audioElement.play().catch(() => {
        // Alguns navegadores so liberam audio apos interacao direta do usuario — a tela mostra
        // um botao para tentar de novo (ver onAudioBlocked / resumeAudio).
        onAudioBlockedRef.current?.()
      })
      connectedRef.current = true
      connectingRef.current = false
      onConnectedRef.current?.()
    } catch (error) {
      connectingRef.current = false
      if (mountedRef.current) {
        onErrorRef.current(toError(error))
      }
    }
  }, [clientSecret, model, transcriptionModel, instructions])

  useImperativeHandle(
    ref,
    () => ({
      sendText(text: string) {
        sessionRef.current?.sendMessage({
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text
            }
          ]
        })
      },
      interrupt() {
        sessionRef.current?.interrupt()
      },
      requestResponse(modalities: ('text' | 'audio')[] = ['audio']) {
        const transport = sessionRef.current?.transport
        if (!transport || !('sendEvent' in transport)) return

        transport.sendEvent({
          type: 'response.create',
          response: {
            output_modalities: modalities
          }
        })
      },
      resumeAudio() {
        audioElementRef.current?.play().catch(() => undefined)
      }
    }),
    []
  )

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [connect, disconnect])

  useEffect(() => {
    if (!sessionRef.current) return

    try {
      sessionRef.current.mute(muted)
    } catch {
      // Ignora se a sessao ainda estiver negociando.
    }
  }, [muted])

  return null
})

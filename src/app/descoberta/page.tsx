'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Keyboard, Loader2, Mic, Send, Sparkles, Volume2 } from 'lucide-react'

import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import {
  DiscoveryRealtimeSession,
  type DiscoveryRealtimeHistoryMessage,
  type DiscoveryRealtimeSessionHandle,
  type DiscoveryRealtimeUsage
} from '@/components/discovery/DiscoveryRealtimeSession'
import {
  DISCOVERY_AUDIO_MAX_SECONDS,
  DISCOVERY_AUDIO_NUDGE_SECONDS,
  DISCOVERY_SESSION_MAX_SECONDS,
  DISCOVERY_TEXT_MAX_LENGTH,
  type DiscoveryTranscriptMessage
} from '@/lib/discovery'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

type DiscoveryStatus = 'checking' | 'consent' | 'chat' | 'finishing'
type DiscoveryUsageTotals = Omit<DiscoveryRealtimeUsage, 'responseId'>

function emptyUsageTotals(): DiscoveryUsageTotals {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTextTokens: 0,
    inputAudioTokens: 0,
    outputTextTokens: 0,
    outputAudioTokens: 0
  }
}

function addUsageTotals(
  current: DiscoveryUsageTotals,
  usage: DiscoveryRealtimeUsage
): DiscoveryUsageTotals {
  return {
    inputTokens: current.inputTokens + usage.inputTokens,
    outputTokens: current.outputTokens + usage.outputTokens,
    totalTokens: current.totalTokens + usage.totalTokens,
    inputTextTokens: current.inputTextTokens + usage.inputTextTokens,
    inputAudioTokens: current.inputAudioTokens + usage.inputAudioTokens,
    outputTextTokens: current.outputTextTokens + usage.outputTextTokens,
    outputAudioTokens: current.outputAudioTokens + usage.outputAudioTokens
  }
}

function estimateMessageDuration(text: string, channel: 'voice' | 'text') {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const wordsPerSecond = channel === 'voice' ? 2.4 : 3.2
  return Math.max(1, Math.round(words / wordsPerSecond))
}

/**
 * Garante alternancia estrita assistant/user e remove duplicatas — sem logica de deteccao de
 * fim de conversa (isso agora e feito pela tool-call `finish_discovery`, nao por texto).
 */
function normalizeDiscoveryMessageSequence(
  messages: DiscoveryTranscriptMessage[]
): DiscoveryTranscriptMessage[] {
  const normalizedMessages: DiscoveryTranscriptMessage[] = []
  const seenMessageIds = new Set<string>()
  let expectedRole: 'assistant' | 'user' = 'assistant'

  for (const message of messages) {
    if (seenMessageIds.has(message.messageId)) continue
    if (message.role !== expectedRole) continue

    normalizedMessages.push(message)
    seenMessageIds.add(message.messageId)
    expectedRole = expectedRole === 'assistant' ? 'user' : 'assistant'
  }

  return normalizedMessages
}

export default function DiscoveryPage() {
  const router = useRouter()
  const [status, setStatus] = useState<DiscoveryStatus>('checking')
  const [messages, setMessages] = useState<DiscoveryTranscriptMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)
  const [realtimeClientSecret, setRealtimeClientSecret] = useState<string | null>(null)
  const [realtimeSessionId, setRealtimeSessionId] = useState<string | null>(null)
  const [realtimeModel, setRealtimeModel] = useState<string | null>(null)
  const [realtimeTranscriptionModel, setRealtimeTranscriptionModel] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(true)
  const [textMode, setTextMode] = useState(false)
  const [isPressingVoice, setIsPressingVoice] = useState(false)
  const [isCancellingVoice, setIsCancellingVoice] = useState(false)
  const [inputVolume, setInputVolume] = useState(0)
  const [voiceElapsedSeconds, setVoiceElapsedSeconds] = useState(0)
  const [hasUsedVoice, setHasUsedVoice] = useState(false)

  const voiceButtonRef = useRef<HTMLButtonElement | null>(null)
  const conversationEndRef = useRef<HTMLDivElement | null>(null)
  const realtimeSessionRef = useRef<DiscoveryRealtimeSessionHandle | null>(null)
  const messagesRef = useRef<DiscoveryTranscriptMessage[]>([])
  const completedRef = useRef(false)
  const completionEventIdRef = useRef<string | null>(null)
  const openingRequestedRef = useRef(false)
  const usageTotalsRef = useRef<DiscoveryUsageTotals>(emptyUsageTotals())
  const sessionStartedAtRef = useRef<number | null>(null)
  const voiceStartedAtRef = useRef<number | null>(null)
  const voiceResponseRequestedRef = useRef(false)
  const waitingVoiceTranscriptRef = useRef(false)
  const textStartedAtRef = useRef<number | null>(null)
  const pendingUserVoiceDurationsRef = useRef<number[]>([])
  const pendingUserTextDurationsRef = useRef<number[]>([])
  const durationByMessageIdRef = useRef<Map<string, number>>(new Map())

  const voiceSecondsLeft = Math.max(0, DISCOVERY_AUDIO_MAX_SECONDS - voiceElapsedSeconds)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [error, messages])

  useEffect(() => {
    if (!isPressingVoice) {
      setVoiceElapsedSeconds(0)
      return
    }

    const updateElapsed = () => {
      const elapsed = Math.floor((Date.now() - (voiceStartedAtRef.current ?? Date.now())) / 1000)
      setVoiceElapsedSeconds(elapsed)
    }

    const interval = window.setInterval(updateElapsed, 250)
    const nudgeTimeout = window.setTimeout(() => {
      if ('vibrate' in navigator) navigator.vibrate(24)
    }, DISCOVERY_AUDIO_NUDGE_SECONDS * 1000)
    const hardCapTimeout = window.setTimeout(() => {
      setIsPressingVoice(false)
      setIsCancellingVoice(false)
      voiceStartedAtRef.current = null
      pendingUserVoiceDurationsRef.current.push(DISCOVERY_AUDIO_MAX_SECONDS)
      setHasUsedVoice(true)
      requestVoiceResponseAfterRelease()
      window.setTimeout(() => setVoiceMuted(true), 1800)
    }, DISCOVERY_AUDIO_MAX_SECONDS * 1000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(nudgeTimeout)
      window.clearTimeout(hardCapTimeout)
    }
  }, [isPressingVoice])

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      const response = await fetch('/api/discovery/status')

      if (response.status === 401) {
        router.replace('/login')
        return
      }

      const data = await response.json()
      if (cancelled) return

      if (!data.requiresDiscovery) {
        router.replace('/chat')
      } else if (data.consentedAt) {
        setStatus('chat')
        await connectRealtime()
      } else {
        setStatus('consent')
      }
    }

    checkStatus().catch(() => setStatus('consent'))

    return () => {
      cancelled = true
    }
  }, [router])

  async function connectRealtime() {
    if (realtimeClientSecret) return

    try {
      const response = await fetch('/api/discovery/realtime-token', { method: 'POST' })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Falha ao conectar realtime')
      }

      const data = await response.json()
      setRealtimeClientSecret(data.clientSecret)
      setRealtimeSessionId(data.sessionId)
      setRealtimeModel(data.model)
      setRealtimeTranscriptionModel(data.transcriptionModel)
    } catch {
      setError('Não consegui abrir a conversa por voz agora. Você ainda pode escrever.')
    }
  }

  async function acceptConsent(accepted: boolean) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/discovery/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted })
      })

      if (!response.ok) throw new Error('Falha ao gravar consentimento')

      if (!accepted) {
        router.replace('/chat')
        return
      }

      setStatus('chat')
      await connectRealtime()
    } catch {
      setError('Algo deu errado. Tenta de novo?')
    } finally {
      setLoading(false)
    }
  }

  function seedOpeningContext() {
    if (openingRequestedRef.current) return
    openingRequestedRef.current = true
    sessionStartedAtRef.current ??= Date.now()
    realtimeSessionRef.current?.requestResponse(['audio'])
  }

  function submitTextResponse(text: string) {
    const trimmedText = text.trim()
    if (!trimmedText || loading || finished) return

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - (textStartedAtRef.current ?? Date.now())) / 1000)
    )
    const nextTranscript: DiscoveryTranscriptMessage[] = [
      ...messagesRef.current,
      {
        messageId: `local-text-${Date.now()}`,
        role: 'user',
        text: trimmedText,
        channel: 'text',
        durationSeconds
      }
    ]

    pendingUserTextDurationsRef.current.push(durationSeconds)
    textStartedAtRef.current = null

    setInput('')
    messagesRef.current = nextTranscript
    setMessages(nextTranscript)
    setError('')
    setTextMode(false)

    try {
      if (!realtimeSessionRef.current) throw new Error('Sessão realtime indisponível')
      realtimeSessionRef.current.sendText(trimmedText)
    } catch {
      setError('Perdi a conexão por um instante. Repete pra mim?')
    }
  }

  function handleTextSubmit(event: FormEvent) {
    event.preventDefault()
    submitTextResponse(input)
  }

  function isPointerInsideVoiceButton(clientX: number, clientY: number) {
    const rect = voiceButtonRef.current?.getBoundingClientRect()
    if (!rect) return true
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  function startVoicePress() {
    if (!realtimeConnected || loading || finished) return
    if ('vibrate' in navigator) navigator.vibrate(18)

    setIsPressingVoice(true)
    setIsCancellingVoice(false)
    setVoiceMuted(false)
    voiceResponseRequestedRef.current = false
    waitingVoiceTranscriptRef.current = false
    voiceStartedAtRef.current = Date.now()
  }

  function requestVoiceResponseAfterRelease() {
    if (voiceResponseRequestedRef.current || finished || completedRef.current) return

    voiceResponseRequestedRef.current = true
    waitingVoiceTranscriptRef.current = true
    window.setTimeout(() => {
      if (!waitingVoiceTranscriptRef.current || finished || completedRef.current) return
      waitingVoiceTranscriptRef.current = false
      realtimeSessionRef.current?.requestResponse()
    }, 2400)
  }

  function moveVoicePress(clientX: number, clientY: number) {
    if (!isPressingVoice) return
    setIsCancellingVoice(!isPointerInsideVoiceButton(clientX, clientY))
  }

  function endVoicePress() {
    if (!isPressingVoice) return

    setIsPressingVoice(false)
    setIsCancellingVoice(false)

    const voiceDurationSeconds = voiceStartedAtRef.current
      ? Math.max(1, Math.round((Date.now() - voiceStartedAtRef.current) / 1000))
      : 1
    voiceStartedAtRef.current = null

    if (isCancellingVoice) {
      setVoiceMuted(true)
      waitingVoiceTranscriptRef.current = false
      realtimeSessionRef.current?.interrupt()
    } else {
      pendingUserVoiceDurationsRef.current.push(voiceDurationSeconds)
      setHasUsedVoice(true)
      requestVoiceResponseAfterRelease()
      window.setTimeout(() => setVoiceMuted(true), 1800)
    }
  }

  const handleRealtimeTranscript = useCallback(
    (text: string, role: 'user' | 'assistant', itemId?: string) => {
      if (role !== 'user' || !itemId) return

      setMessages((currentMessages) => {
        let changed = false
        const nextMessages = currentMessages.map((message) => {
          if (message.messageId !== itemId || message.text === text) return message
          changed = true
          return { ...message, text: text.slice(0, DISCOVERY_TEXT_MAX_LENGTH) }
        })

        if (changed) messagesRef.current = nextMessages
        return changed ? nextMessages : currentMessages
      })

      if (waitingVoiceTranscriptRef.current && !finished && !completedRef.current) {
        waitingVoiceTranscriptRef.current = false
        window.setTimeout(() => realtimeSessionRef.current?.requestResponse(), 100)
      }
    },
    [finished]
  )

  const handleRealtimeHistory = useCallback(
    (historyMessages: DiscoveryRealtimeHistoryMessage[]) => {
      if (historyMessages.length === 0) return

      setMessages(() => {
        const nextMessages: DiscoveryTranscriptMessage[] = historyMessages.map((message) => {
          const messageText =
            message.role === 'user' ? message.text.slice(0, DISCOVERY_TEXT_MAX_LENGTH) : message.text
          let durationSeconds = durationByMessageIdRef.current.get(message.itemId)

          if (durationSeconds === undefined) {
            if (message.role === 'user' && message.channel === 'voice') {
              durationSeconds = pendingUserVoiceDurationsRef.current.shift()
            } else if (message.role === 'user' && message.channel === 'text') {
              durationSeconds = pendingUserTextDurationsRef.current.shift()
            }

            durationSeconds ??= estimateMessageDuration(messageText, message.channel)
            durationByMessageIdRef.current.set(message.itemId, durationSeconds)
          }

          return {
            messageId: message.itemId,
            role: message.role,
            text: messageText,
            channel: message.channel,
            durationSeconds
          }
        })

        return normalizeDiscoveryMessageSequence(nextMessages)
      })
    },
    []
  )

  const handleRealtimeUsage = useCallback((usage: DiscoveryRealtimeUsage) => {
    usageTotalsRef.current = addUsageTotals(usageTotalsRef.current, usage)
  }, [])

  const handleFinishDiscovery = useCallback(() => {
    setVoiceMuted(true)
    setIsPressingVoice(false)
    setIsCancellingVoice(false)
    voiceStartedAtRef.current = null
    waitingVoiceTranscriptRef.current = false
    setFinished(true)
  }, [])

  useEffect(() => {
    if (!finished || completedRef.current || messagesRef.current.length === 0) return

    completedRef.current = true
    setStatus('finishing')
    let cancelled = false

    const timeout = window.setTimeout(async () => {
      while (!cancelled) {
        try {
          completionEventIdRef.current ??= window.crypto.randomUUID()
          const response = await fetch('/api/discovery/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: completionEventIdRef.current,
              transcript: messagesRef.current,
              totalDurationSeconds: Math.min(
                DISCOVERY_SESSION_MAX_SECONDS,
                Math.max(1, Math.round((Date.now() - (sessionStartedAtRef.current ?? Date.now())) / 1000))
              ),
              usage: usageTotalsRef.current
            })
          })

          if (!response.ok) throw new Error(`Falha ao concluir descoberta: ${response.status}`)

          router.replace('/chat')
          return
        } catch {
          setError('Só um instante, estou guardando nossa conversa...')
          await new Promise((resolve) => window.setTimeout(resolve, 3000))
        }
      }
    }, 1200)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [finished, router])

  const showChat = status === 'chat' || status === 'finishing'

  return (
    <div className="relative isolate flex h-svh flex-col overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      {realtimeClientSecret && realtimeSessionId && realtimeModel && realtimeTranscriptionModel && (
        <DiscoveryRealtimeSession
          ref={realtimeSessionRef}
          clientSecret={realtimeClientSecret}
          sessionId={realtimeSessionId}
          model={realtimeModel}
          transcriptionModel={realtimeTranscriptionModel}
          muted={voiceMuted}
          onTranscript={handleRealtimeTranscript}
          onHistoryUpdated={handleRealtimeHistory}
          onUsage={handleRealtimeUsage}
          onInputVolume={setInputVolume}
          onConnected={() => {
            setRealtimeConnected(true)
            seedOpeningContext()
          }}
          onDisconnected={() => setRealtimeConnected(false)}
          onAudioBlocked={() => setAudioBlocked(true)}
          onFinishDiscovery={handleFinishDiscovery}
          onError={(sessionError) => {
            console.error('[Discovery Realtime] Sessão:', sessionError)
            setError('A voz oscilou por aqui. Se preferir, escreve pra mim.')
          }}
        />
      )}

      <ChatAppHeader onSuggestion={() => {}} onBack={() => router.push('/chat')} />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden px-4 pb-4">
        {status === 'checking' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="size-6 animate-spin text-violet-600 dark:text-violet-300" />
          </div>
        ) : null}

        {status === 'consent' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/75 text-violet-700 shadow-lg shadow-violet-950/10 backdrop-blur-xl dark:bg-zinc-900/80 dark:text-violet-200">
              <Sparkles className="size-7" />
            </span>
            <p className="max-w-md text-xl leading-relaxed text-zinc-900 dark:text-zinc-100">
              Posso lembrar do nosso papo para te conhecer melhor?
            </p>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <div className="mt-2 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => acceptConsent(true)}
                disabled={loading}
                className="h-12 flex-1 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl disabled:opacity-60"
              >
                Pode sim
              </button>
              <button
                type="button"
                onClick={() => acceptConsent(false)}
                disabled={loading}
                className={cn(
                  glassPanelClass,
                  'h-12 flex-1 rounded-full px-5 text-sm font-medium text-zinc-700 transition hover:bg-white/70 disabled:opacity-60 dark:text-zinc-200'
                )}
              >
                Agora não
              </button>
            </div>
          </div>
        ) : null}

        {showChat ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto py-4 [scrollbar-width:thin]">
              <div className="flex flex-col gap-4">
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant'
                  return (
                    <div
                      key={message.messageId}
                      className={cn(
                        'flex animate-in fade-in slide-in-from-bottom-2 gap-2.5 duration-500',
                        isAssistant ? 'items-start justify-start' : 'items-end justify-end'
                      )}
                    >
                      {isAssistant ? (
                        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/75 text-violet-700 shadow-md shadow-violet-950/10 backdrop-blur-xl dark:bg-zinc-900/80 dark:text-violet-200">
                          <Sparkles className="size-4" />
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          'max-w-[86%] whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed shadow-lg',
                          isAssistant
                            ? cn(glassPanelClass, 'rounded-[1.35rem] rounded-tl-md text-zinc-800 dark:text-zinc-100')
                            : 'rounded-[1.35rem] rounded-br-md bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-violet-600/15'
                        )}
                      >
                        {message.text}
                      </div>
                    </div>
                  )
                })}

                {status === 'finishing' ? (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-zinc-900/80">
                      <Sparkles className="size-4 animate-pulse text-violet-600 dark:text-violet-300" />
                    </span>
                    <span className="animate-pulse">Guardando nossa conversa…</span>
                  </div>
                ) : null}

                {error ? (
                  <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
                ) : null}

                <div ref={conversationEndRef} />
              </div>
            </div>

            {audioBlocked ? (
              <button
                type="button"
                onClick={() => {
                  realtimeSessionRef.current?.resumeAudio()
                  setAudioBlocked(false)
                }}
                className={cn(
                  glassPanelClass,
                  'mb-3 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-violet-700 dark:text-violet-200'
                )}
              >
                <Volume2 className="size-4" />
                Ativar áudio
              </button>
            ) : null}

            {isPressingVoice ? (
              <div className="mb-3 flex items-center justify-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                <span>{isCancellingVoice ? 'solte para cancelar' : 'solte para enviar'}</span>
                <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{voiceSecondsLeft}s</span>
              </div>
            ) : null}

            <div className="flex shrink-0 items-center justify-center gap-5 pb-[env(safe-area-inset-bottom)] pt-2">
              {textMode ? (
                <form
                  onSubmit={handleTextSubmit}
                  className={cn(
                    glassPanelClass,
                    'flex w-full items-center gap-1.5 rounded-[1.35rem] p-1.5'
                  )}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={loading || finished}
                    autoFocus
                    maxLength={DISCOVERY_TEXT_MAX_LENGTH}
                    placeholder="Escreve pra mim…"
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    aria-label="Voltar para voz"
                    onClick={() => {
                      setTextMode(false)
                      textStartedAtRef.current = null
                    }}
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-violet-700 transition hover:bg-white/40 dark:text-violet-200"
                  >
                    <Mic className="size-5" />
                  </button>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading || finished}
                    aria-label="Enviar"
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 disabled:opacity-40"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    aria-label="Abrir teclado"
                    onClick={() => {
                      textStartedAtRef.current = Date.now()
                      setTextMode(true)
                    }}
                    className="flex size-12 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white/40 dark:text-zinc-300"
                  >
                    <Keyboard className="size-5" />
                  </button>

                  <button
                    ref={voiceButtonRef}
                    type="button"
                    aria-label="Segure para falar"
                    disabled={!realtimeConnected || loading || finished}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId)
                      startVoicePress()
                    }}
                    onPointerMove={(event) => moveVoicePress(event.clientX, event.clientY)}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                      endVoicePress()
                    }}
                    onPointerCancel={endVoicePress}
                    onContextMenu={(event) => event.preventDefault()}
                    className={cn(
                      'relative flex size-20 select-none items-center justify-center rounded-full text-white shadow-xl shadow-violet-500/25 transition-all duration-200 [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] touch-none disabled:opacity-40 sm:size-24',
                      isPressingVoice
                        ? isCancellingVoice
                          ? 'scale-95 bg-red-600'
                          : 'scale-110 bg-gradient-to-br from-violet-600 to-purple-600'
                        : 'bg-gradient-to-br from-violet-600 to-purple-600'
                    )}
                  >
                    {isPressingVoice ? (
                      <span
                        className="absolute inset-[-10px] rounded-full border border-violet-400/50 transition-transform duration-75"
                        style={{
                          transform: `scale(${1 + inputVolume * 0.8})`,
                          opacity: 0.45 + inputVolume * 0.55
                        }}
                      />
                    ) : null}
                    <Mic className="relative size-8 sm:size-9" />
                  </button>

                  <div className="size-12" />
                </>
              )}
            </div>

            {!textMode && !hasUsedVoice ? (
              <p className="pb-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {realtimeConnected ? 'Segure para falar' : 'Conectando voz…'}
              </p>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  )
}

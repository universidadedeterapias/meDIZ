'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Mic, Send, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VoiceOrb } from '@/components/chat/VoiceOrb'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'
import {
  getAudioFileExtension,
  getSupportedRecordingMimeType,
  MAX_RECORDING_MS
} from '@/lib/conversational-chat/audio'

type ChatComposerProps = {
  value: string
  placeholder: string
  loading?: boolean
  className?: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSubmitText?: (text: string) => void
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error'
type PendingAction = 'review' | 'send'

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const ChatComposer = forwardRef<HTMLInputElement, ChatComposerProps>(
  function ChatComposer(
    { value, placeholder, loading = false, className, onChange, onSubmit, onSubmitText },
    ref
  ) {
    const { t } = useTranslation()
    const canSubmit = Boolean(value.trim()) && !loading

    const [recordingState, setRecordingState] = useState<RecordingState>('idle')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [micErrorKey, setMicErrorKey] = useState<
      'permissionDenied' | 'error' | 'unavailable' | null
    >(null)

    const inputElementRef = useRef<HTMLInputElement | null>(null)
    const setInputRef = (node: HTMLInputElement | null) => {
      inputElementRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const pendingActionRef = useRef<PendingAction>('review')
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Esfera reage ao volume da voz enquanto grava: AnalyserNode le o mesmo
    // stream do microfone (sem tocar no MediaRecorder) e aplica a escala
    // direto no DOM a cada frame, sem passar por re-render do React.
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const levelRafRef = useRef<number | null>(null)
    const orbScaleRef = useRef<HTMLDivElement | null>(null)

    const isMicSupported =
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'

    const clearTimers = () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    const releaseStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    const stopLevelMonitoring = () => {
      if (levelRafRef.current !== null) cancelAnimationFrame(levelRafRef.current)
      levelRafRef.current = null
      analyserRef.current = null
      if (orbScaleRef.current) orbScaleRef.current.style.transform = 'scale(1)'
      const audioContext = audioContextRef.current
      audioContextRef.current = null
      if (audioContext && audioContext.state !== 'closed') {
        void audioContext.close().catch(() => {})
      }
    }

    const startLevelMonitoring = (stream: MediaStream) => {
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AudioContextCtor) return

        const audioContext = new AudioContextCtor()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.65
        source.connect(analyser)

        audioContextRef.current = audioContext
        analyserRef.current = analyser

        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          const level = Math.min(1, sum / data.length / 130)
          if (orbScaleRef.current) {
            orbScaleRef.current.style.transform = `scale(${1 + level * 0.4})`
          }
          levelRafRef.current = requestAnimationFrame(tick)
        }
        tick()
      } catch {
        // Reagir ao volume e so um efeito visual — se o navegador nao suportar
        // Web Audio API, a gravacao/transcricao segue normalmente sem ele.
      }
    }

    useEffect(() => {
      return () => {
        clearTimers()
        releaseStream()
        stopLevelMonitoring()
      }
    }, [])

    // O input fica disabled durante o envio (loading), o que tira o foco do
    // usuario. Ao voltar para false (resposta recebida), devolve o foco para
    // que a pessoa possa digitar a proxima mensagem sem precisar clicar de novo.
    const wasLoadingRef = useRef(loading)
    useEffect(() => {
      const isBusyWithAudio =
        recordingState === 'recording' || recordingState === 'transcribing'
      if (wasLoadingRef.current && !loading && !isBusyWithAudio) {
        inputElementRef.current?.focus()
      }
      wasLoadingRef.current = loading
    }, [loading, recordingState])

    const transcribeAudio = async (blob: Blob, action: PendingAction) => {
      setRecordingState('transcribing')
      setMicErrorKey(null)

      try {
        const formData = new FormData()
        const extension = getAudioFileExtension(blob.type || 'audio/webm')
        formData.append('audio', blob, `recording.${extension}`)

        const response = await fetch('/api/conversational-chat/transcribe', {
          method: 'POST',
          body: formData
        })

        const data = await response.json().catch(() => null)
        const transcript =
          typeof data?.transcript === 'string' ? data.transcript.trim() : ''

        if (!response.ok || !transcript) {
          setRecordingState('error')
          setMicErrorKey('error')
          return
        }

        if (action === 'send') {
          if (onSubmitText) {
            onSubmitText(transcript)
          } else {
            onChange(transcript)
          }
        } else {
          onChange(transcript)
        }
        setRecordingState('idle')
      } catch {
        setRecordingState('error')
        setMicErrorKey('error')
      }
    }

    const stopRecording = (action: PendingAction) => {
      pendingActionRef.current = action
      clearTimers()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }

    const startRecording = async () => {
      if (!isMicSupported) {
        setRecordingState('error')
        setMicErrorKey('unavailable')
        return
      }

      setMicErrorKey(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        const mimeType = getSupportedRecordingMimeType()
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)

        chunksRef.current = []
        pendingActionRef.current = 'review'
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          releaseStream()
          stopLevelMonitoring()
          const chunks = chunksRef.current
          chunksRef.current = []
          if (!chunks.length) {
            setRecordingState('idle')
            return
          }
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
          void transcribeAudio(blob, pendingActionRef.current)
        }

        mediaRecorderRef.current = recorder
        recorder.start()
        startLevelMonitoring(stream)
        setRecordingState('recording')
        setElapsedSeconds(0)

        countdownIntervalRef.current = setInterval(() => {
          setElapsedSeconds((prev) => {
            const next = prev + 1
            if (next >= MAX_RECORDING_MS / 1000) {
              stopRecording('review')
            }
            return next
          })
        }, 1000)
      } catch {
        setRecordingState('error')
        setMicErrorKey('permissionDenied')
      }
    }

    const handleMicClick = () => {
      if (recordingState === 'transcribing') return
      void startRecording()
    }

    const handleStopClick = () => stopRecording('review')
    const handleSendAudioClick = () => stopRecording('send')

    const micLabel = t('chat.home.microphone.record', 'Gravar áudio')
    const stopLabel = t('chat.home.microphone.recording', 'Gravando… toque para parar')
    const sendAudioLabel = t('chat.send', 'Enviar')

    const errorMessage = micErrorKey
      ? t(`chat.home.microphone.${micErrorKey}`, '')
      : null

    const isRecording = recordingState === 'recording'
    const isTranscribing = recordingState === 'transcribing'

    return (
      <>
        <AnimatePresence>
          {isRecording ? (
            <motion.div
              key="voice-listening-overlay"
              className="fixed inset-0 z-40 flex items-center justify-center bg-white/45 backdrop-blur-2xl dark:bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              aria-hidden
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.65 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.65 }}
                transition={{ type: 'spring', damping: 18, stiffness: 180 }}
              >
                <div ref={orbScaleRef} style={{ transition: 'transform 120ms ease-out' }}>
                  <VoiceOrb size={190} />
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className={cn('relative z-50 flex w-full flex-col gap-1.5', className)}>
        <div
          className={cn(
            'flex w-full items-center gap-1.5 rounded-[1.35rem] p-1.5 shadow-2xl shadow-violet-950/15 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:shadow-black/35',
            isRecording
              ? 'bg-white/60 backdrop-blur-md dark:bg-zinc-900/60'
              : 'bg-gradient-to-r from-white via-white to-violet-50/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/20'
          )}
        >
          <div className="relative flex size-11 shrink-0 items-center justify-center">
            <AnimatePresence initial={false}>
              {isRecording || isTranscribing ? (
                <motion.button
                  key="stop"
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                  onClick={handleStopClick}
                  disabled={isTranscribing}
                  aria-label={stopLabel}
                  title={stopLabel}
                  className="absolute inset-0 flex size-11 items-center justify-center rounded-2xl bg-red-100 text-red-600 shadow-inner disabled:opacity-60 dark:bg-red-500/20 dark:text-red-300"
                >
                  {isTranscribing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Square className="size-4 fill-current" />
                  )}
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  type="button"
                  layoutId="composer-mic-send"
                  onClick={handleMicClick}
                  disabled={loading}
                  aria-label={micLabel}
                  title={micLabel}
                  className="absolute inset-0 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 shadow-inner disabled:opacity-60 dark:from-violet-500/20 dark:to-purple-500/10 dark:text-violet-200"
                >
                  <Mic className="size-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {isRecording ? (
            <span className="shrink-0 text-sm font-medium tabular-nums text-red-600 dark:text-red-300">
              {formatElapsed(elapsedSeconds)}
            </span>
          ) : null}

          <Input
            ref={setInputRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canSubmit) onSubmit()
              }
            }}
            placeholder={
              isRecording
                ? stopLabel
                : isTranscribing
                  ? t('chat.home.microphone.transcribing', 'Transcrevendo áudio…')
                  : placeholder
            }
            disabled={loading || isRecording || isTranscribing}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <div className="relative flex size-11 shrink-0 items-center justify-center">
            {isRecording ? (
              <motion.button
                key="send-audio"
                type="button"
                layoutId="composer-mic-send"
                onClick={handleSendAudioClick}
                aria-label={sendAudioLabel}
                title={sendAudioLabel}
                className="absolute inset-0 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25"
              >
                <Send className="size-4" />
              </motion.button>
            ) : (
              <Button
                type="button"
                size="icon"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="absolute inset-0 size-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/30 focus-visible:ring-violet-500 disabled:shadow-none"
                aria-label={sendAudioLabel}
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {errorMessage ? (
          <p className="px-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
        ) : null}
        </div>
      </>
    )
  }
)

'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Send, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
}

type RecordingState = 'idle' | 'recording' | 'transcribing' | 'error'

export const ChatComposer = forwardRef<HTMLInputElement, ChatComposerProps>(
  function ChatComposer(
    { value, placeholder, loading = false, className, onChange, onSubmit },
    ref
  ) {
    const { t } = useTranslation()
    const canSubmit = Boolean(value.trim()) && !loading

    const [recordingState, setRecordingState] = useState<RecordingState>('idle')
    const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_MS / 1000)
    const [micErrorKey, setMicErrorKey] = useState<
      'permissionDenied' | 'error' | 'unavailable' | null
    >(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const isMicSupported =
      typeof window !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'

    const clearTimers = () => {
      if (autoStopTimeoutRef.current) clearTimeout(autoStopTimeoutRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      autoStopTimeoutRef.current = null
      countdownIntervalRef.current = null
    }

    const releaseStream = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    useEffect(() => {
      return () => {
        clearTimers()
        releaseStream()
      }
    }, [])

    const transcribeAudio = async (blob: Blob) => {
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

        onChange(transcript)
        setRecordingState('idle')
      } catch {
        setRecordingState('error')
        setMicErrorKey('error')
      }
    }

    const stopRecording = () => {
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
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          releaseStream()
          const chunks = chunksRef.current
          chunksRef.current = []
          if (!chunks.length) {
            setRecordingState('idle')
            return
          }
          const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
          void transcribeAudio(blob)
        }

        mediaRecorderRef.current = recorder
        recorder.start()
        setRecordingState('recording')
        setSecondsLeft(MAX_RECORDING_MS / 1000)

        countdownIntervalRef.current = setInterval(() => {
          setSecondsLeft((prev) => Math.max(prev - 1, 0))
        }, 1000)
        autoStopTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS)
      } catch {
        setRecordingState('error')
        setMicErrorKey('permissionDenied')
      }
    }

    const handleMicClick = () => {
      if (recordingState === 'recording') {
        stopRecording()
        return
      }
      if (recordingState === 'transcribing') return
      void startRecording()
    }

    const micLabel =
      recordingState === 'recording'
        ? t('chat.home.microphone.recording', 'Gravando… toque para parar')
        : recordingState === 'transcribing'
          ? t('chat.home.microphone.transcribing', 'Transcrevendo áudio…')
          : t('chat.home.microphone.record', 'Gravar áudio')

    const errorMessage = micErrorKey
      ? t(`chat.home.microphone.${micErrorKey}`, '')
      : null

    return (
      <div className={cn('flex w-full flex-col gap-1.5', className)}>
        <div className="flex w-full items-center gap-1.5 rounded-[1.35rem] bg-gradient-to-r from-white via-white to-violet-50/70 p-1.5 shadow-2xl shadow-violet-950/15 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/20 dark:shadow-black/35">
          <button
            type="button"
            onClick={handleMicClick}
            disabled={loading || recordingState === 'transcribing'}
            aria-label={micLabel}
            title={micLabel}
            className={cn(
              'relative flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-colors disabled:opacity-60',
              recordingState === 'recording'
                ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300'
                : 'bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 dark:from-violet-500/20 dark:to-purple-500/10 dark:text-violet-200'
            )}
          >
            {recordingState === 'transcribing' ? (
              <Loader2 className="size-5 animate-spin" />
            ) : recordingState === 'recording' ? (
              <Square className="size-4 fill-current" />
            ) : (
              <Mic className="size-5" />
            )}
          </button>

          <Input
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canSubmit) onSubmit()
              }
            }}
            placeholder={
              recordingState === 'recording'
                ? `${micLabel} (${secondsLeft}s)`
                : placeholder
            }
            disabled={loading || recordingState === 'recording' || recordingState === 'transcribing'}
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Button
            type="button"
            size="icon"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="size-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/30 focus-visible:ring-violet-500 disabled:shadow-none"
            aria-label={t('chat.send', 'Enviar')}
          >
            <Send className="size-4" />
          </Button>
        </div>

        {errorMessage ? (
          <p className="px-2 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
        ) : null}
      </div>
    )
  }
)

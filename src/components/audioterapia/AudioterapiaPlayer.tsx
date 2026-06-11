'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft,
  Headphones,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMediaTime } from '@/lib/format-media-time'

type AudioterapiaPlayerProps = {
  coverSrc: string
  productTitle: string
  trackTitle: string
  tagLabel: string
  author?: string
  mediaUrl: string
  isVideo?: boolean
  /** Exibe o vídeo no quadro central (Biblioteca) em vez da capa estática */
  showVideoInFrame?: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  backHref: string
}

function splitTitleForDisplay(title: string): { lead: string; accent: string } {
  const words = title.trim().split(/\s+/)
  if (words.length <= 1) {
    return { lead: title.toUpperCase(), accent: '' }
  }
  const accent = words.pop() ?? ''
  return { lead: words.join(' ').toUpperCase(), accent: accent.toUpperCase() }
}

export function AudioterapiaPlayer({
  coverSrc,
  productTitle,
  trackTitle,
  tagLabel,
  author = 'Paulo Barbosa',
  mediaUrl,
  isVideo = false,
  showVideoInFrame = false,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  backHref
}: AudioterapiaPlayerProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffering, setBuffering] = useState(true)
  const { lead, accent } = splitTitleForDisplay(productTitle)

  useEffect(() => {
    const blockSave = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
      }
    }
    window.addEventListener('keydown', blockSave)
    return () => window.removeEventListener('keydown', blockSave)
  }, [])

  const seek = useCallback((time: number) => {
    const el = mediaRef.current
    if (!el || !Number.isFinite(time)) return
    el.currentTime = Math.min(Math.max(0, time), el.duration || time)
    setCurrentTime(el.currentTime)
  }, [])

  const togglePlay = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    if (el.paused) {
      void el.play()
    } else {
      el.pause()
    }
  }, [])

  const skipSeconds = useCallback(
    (delta: number) => {
      const el = mediaRef.current
      if (!el) return
      seek((el.currentTime || 0) + delta)
    },
    [seek]
  )

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return

    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffering(true)

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onLoaded = () => {
      setDuration(el.duration || 0)
      setBuffering(false)
      void el.play().catch(() => setPlaying(false))
    }
    const onWaiting = () => setBuffering(true)
    const onCanPlay = () => setBuffering(false)
    const onError = () => {
      setBuffering(false)
      setPlaying(false)
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('durationchange', onLoaded)
    el.addEventListener('waiting', onWaiting)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('error', onError)

    el.load()

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('durationchange', onLoaded)
      el.removeEventListener('waiting', onWaiting)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('error', onError)
    }
  }, [mediaUrl])

  const videoInFrame = isVideo && showVideoInFrame
  const TagIcon = videoInFrame ? Video : Headphones
  const showTrackNav = hasPrev || hasNext

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col bg-gradient-to-b from-violet-100/90 via-violet-50/40 to-white"
      onContextMenu={(e) => e.preventDefault()}
    >
      {isVideo && !videoInFrame ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={mediaUrl}
          className="sr-only"
          playsInline
          preload="metadata"
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
        />
      ) : !isVideo ? (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={mediaUrl}
          preload="metadata"
          controlsList="nodownload noremoteplayback"
        />
      ) : null}

      <header className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/70 text-violet-700 shadow-sm hover:bg-white"
          asChild
        >
          <Link href={backHref} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <p className="text-lg font-bold tracking-tight">
          <span className="text-violet-600">me</span>
          <span className="text-indigo-600">DIZ</span>
          <span className="text-amber-500">!</span>
        </p>
        <div className="w-10" />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-2">
        <div className="mx-auto w-full max-w-[280px]">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-black shadow-[0_20px_50px_-20px_rgba(91,33,182,0.45)]">
            {videoInFrame ? (
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={mediaUrl}
                className="h-full w-full object-cover"
                playsInline
                preload="metadata"
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <Image
                src={coverSrc}
                alt={productTitle}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[1.65rem]">
            {lead}
            {accent ? (
              <>
                <br />
                <span className="text-violet-600">{accent}</span>
              </>
            ) : null}
          </h1>
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
              <TagIcon className="h-3.5 w-3.5" />
              {tagLabel || (videoInFrame ? 'Vídeo' : 'Audioterapia guiada')}
            </span>
          </div>
          {author?.trim() ? (
            <p className="text-sm font-semibold text-foreground">{author}</p>
          ) : null}
          {trackTitle?.trim() ? (
            <p className="text-xs text-muted-foreground">{trackTitle}</p>
          ) : null}
        </div>

        <div className="mt-8 space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-violet-200 accent-violet-600 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600"
            aria-label="Progresso da reprodução"
          />
          <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
            <span>{formatMediaTime(currentTime)}</span>
            <span>{formatMediaTime(duration)}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-5 sm:gap-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-violet-600 hover:bg-violet-100"
            onClick={() => skipSeconds(-15)}
            aria-label="Voltar 15 segundos"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          {showTrackNav ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-violet-600 hover:bg-violet-100 disabled:opacity-30"
              disabled={!hasPrev}
              onClick={onPrev}
              aria-label="Faixa anterior"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            className="h-16 w-16 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300/60 hover:bg-violet-700"
            onClick={togglePlay}
            aria-label={playing ? 'Pausar' : 'Reproduzir'}
          >
            {buffering ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : playing ? (
              <Pause className="h-7 w-7" />
            ) : (
              <Play className="h-7 w-7 translate-x-0.5" />
            )}
          </Button>
          {showTrackNav ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-violet-600 hover:bg-violet-100 disabled:opacity-30"
              disabled={!hasNext}
              onClick={onNext}
              aria-label="Próxima faixa"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-violet-600 hover:bg-violet-100"
            onClick={() => skipSeconds(15)}
            aria-label="Avançar 15 segundos"
          >
            <RotateCw className="h-5 w-5" />
          </Button>
        </div>
      </main>
    </div>
  )
}

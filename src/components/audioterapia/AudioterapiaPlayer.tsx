'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
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
import { PageBackButton } from '@/components/navigation/PageBackButton'
import { Button } from '@/components/ui/button'
import { formatMediaTime } from '@/lib/format-media-time'
import { cn } from '@/lib/utils'

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
  /** square = audioterapia; video = 16:9 para cursos */
  frameAspect?: 'square' | 'video'
  videoFit?: 'cover' | 'contain'
  maxFrameClassName?: string
  /** Oculta cabeçalho com voltar (quando o layout pai já tem navegação) */
  showHeader?: boolean
  /** Preenche o painel pai em vez de ocupar a tela inteira */
  fillContainer?: boolean
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
  frameAspect = 'square',
  videoFit = 'cover',
  maxFrameClassName,
  showHeader = true,
  fillContainer = false,
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
  const isWideVideo = frameAspect === 'video'
  const expandedCourseLayout = fillContainer && isWideVideo
  const frameMaxClass = maxFrameClassName ?? (isWideVideo ? 'max-w-4xl' : 'max-w-[280px]')
  const frameAspectClass = isWideVideo ? 'aspect-video' : 'aspect-square'
  const videoFitClass = videoFit === 'contain' ? 'object-contain' : 'object-cover'

  return (
    <div
      className={cn(
        'relative flex flex-col',
        fillContainer
          ? 'min-h-0 max-lg:flex-none lg:flex-1'
          : 'min-h-[100dvh]',
        isWideVideo
          ? 'bg-background'
          : 'bg-gradient-to-b from-violet-100/90 via-violet-50/40 to-white'
      )}
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

      {showHeader ? (
        <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3 sm:px-6 sm:pt-4">
          <PageBackButton href={backHref} showLabel className="shadow-sm" />
          <p className="text-lg font-bold tracking-tight">
            <span className="text-violet-600">me</span>
            <span className="text-indigo-600">DIZ</span>
            <span className="text-amber-500">!</span>
          </p>
          <div className="w-10" />
        </header>
      ) : null}

      <main
        className={cn(
          'mx-auto flex w-full min-h-0 flex-col',
          expandedCourseLayout
            ? 'max-w-none px-3 pb-3 pt-1 max-lg:flex-none sm:px-4 sm:pb-4 lg:flex-1 lg:px-5 lg:pb-8 lg:pt-2'
            : cn('flex-1 px-5 pb-8 pt-2', isWideVideo ? 'max-w-5xl' : 'max-w-md')
        )}
      >
        <div
          className={cn(
            'mx-auto w-full',
            expandedCourseLayout && 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col',
            frameMaxClass
          )}
        >
          <div
            className={cn(
              'relative w-full overflow-hidden bg-black shadow-lg',
              expandedCourseLayout
                ? 'aspect-video w-full flex-none rounded-lg max-lg:max-h-[42dvh] lg:min-h-0 lg:flex-1 lg:max-h-none lg:rounded-2xl'
                : cn(
                    frameAspectClass,
                    !isWideVideo &&
                      'rounded-[28px] shadow-[0_20px_50px_-20px_rgba(91,33,182,0.45)]',
                    isWideVideo && 'rounded-2xl'
                  )
            )}
          >
            {videoInFrame ? (
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={mediaUrl}
                className={cn('h-full w-full', videoFitClass)}
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

        <div
          className={cn(
            'shrink-0 space-y-1.5 text-center sm:space-y-2',
            expandedCourseLayout ? 'mt-2 max-lg:px-1 sm:mt-3' : isWideVideo ? 'mt-4' : 'mt-6'
          )}
        >
          <h1
            className={cn(
              'font-extrabold leading-tight tracking-tight text-foreground',
              expandedCourseLayout
                ? 'line-clamp-2 text-base sm:text-xl'
                : isWideVideo
                  ? 'text-lg sm:text-xl'
                  : 'text-2xl sm:text-[1.65rem]'
            )}
          >
            {expandedCourseLayout ? (
              <span>{productTitle}</span>
            ) : (
              <>
                {lead}
                {accent ? (
                  <>
                    <br />
                    <span className="text-violet-600">{accent}</span>
                  </>
                ) : null}
              </>
            )}
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
            <p
              className={cn(
                'text-muted-foreground',
                expandedCourseLayout
                  ? 'line-clamp-2 text-[11px] sm:text-xs'
                  : 'text-xs'
              )}
            >
              {trackTitle}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            'shrink-0 space-y-2',
            expandedCourseLayout ? 'mt-2 sm:mt-4' : 'mt-8'
          )}
        >
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

        <div
          className={cn(
            'flex shrink-0 items-center justify-center',
            expandedCourseLayout
              ? 'mt-2 gap-2 sm:mt-4 sm:gap-4'
              : 'mt-6 gap-5 sm:gap-6'
          )}
        >
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
            className={cn(
              'rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300/60 hover:bg-violet-700',
              expandedCourseLayout
                ? 'h-12 w-12 sm:h-14 sm:w-14'
                : 'h-16 w-16'
            )}
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

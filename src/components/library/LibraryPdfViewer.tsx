'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LibraryPdfViewerProps = {
  streamUrl: string
  title: string
  className?: string
  onReady?: () => void
  onError?: () => void
}

export function LibraryPdfViewer({
  streamUrl,
  title,
  className,
  onReady,
  onError
}: LibraryPdfViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setMounted(true)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(false)
  }, [streamUrl])

  const handleLoad = () => {
    setLoading(false)
    onReady?.()
  }

  const handleError = () => {
    setLoading(false)
    setError(true)
    onError?.()
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 items-center justify-center p-6 text-center text-sm text-muted-foreground',
          className
        )}
      >
        Não foi possível carregar o PDF. Feche e abra novamente.
      </div>
    )
  }

  const viewerClassName =
    'h-full min-h-0 w-full min-w-0 border-0 bg-white'

  return (
    <div className={cn('relative h-full min-h-0 w-full min-w-0', className)}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : null}

      {mounted && isIOS ? (
        <embed
          key={streamUrl}
          title={title}
          src={streamUrl}
          type="application/pdf"
          className={viewerClassName}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : mounted ? (
        <iframe
          key={streamUrl}
          title={title}
          src={`${streamUrl}#view=FitH`}
          className={viewerClassName}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </div>
  )
}

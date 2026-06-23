'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/fetchClient'
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const blobRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      setLoading(true)
      setError(false)
      setBlobUrl(null)

      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }

      try {
        const response = await apiFetch(streamUrl, { credentials: 'include' })
        if (!response.ok) throw new Error('fetch_failed')

        const buffer = await response.arrayBuffer()
        if (buffer.byteLength === 0) throw new Error('empty_pdf')

        const header = new Uint8Array(buffer.slice(0, 4))
        if (!String.fromCharCode(...header).startsWith('%PDF')) {
          throw new Error('invalid_pdf')
        }

        const blob = new Blob([buffer], { type: 'application/pdf' })
        const objectUrl = URL.createObjectURL(blob)

        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }

        blobRef.current = objectUrl
        setBlobUrl(objectUrl)
        setLoading(false)
        onReady?.()
      } catch {
        if (!cancelled) {
          setLoading(false)
          setError(true)
          onError?.()
        }
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [streamUrl, onReady, onError])

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

      {blobUrl ? (
        typeof navigator !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
          <embed
            title={title}
            src={blobUrl}
            type="application/pdf"
            className={viewerClassName}
          />
        ) : (
          <iframe
            title={title}
            src={`${blobUrl}#view=FitH`}
            className={viewerClassName}
          />
        )
      ) : null}
    </div>
  )
}

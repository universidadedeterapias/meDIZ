'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LibraryDocumentViewerProps = {
  title: string
  streamUrl: string
  backHref: string
  variant?: 'pdf' | 'video'
}

export function LibraryDocumentViewer({
  title,
  streamUrl,
  backHref,
  variant = 'pdf'
}: LibraryDocumentViewerProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const blockSave = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
      }
    }
    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    window.addEventListener('keydown', blockSave)
    document.addEventListener('contextmenu', blockContextMenu)
    return () => {
      window.removeEventListener('keydown', blockSave)
      document.removeEventListener('contextmenu', blockContextMenu)
    }
  }, [])

  const subtitle =
    variant === 'video'
      ? 'Reprodução protegida — download desativado'
      : 'Visualização protegida — download desativado'

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-violet-50 to-white"
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="flex items-center gap-2 border-b border-violet-100 bg-white/90 px-3 py-3 backdrop-blur sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-full"
          asChild
        >
          <Link href={backHref} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      <div className="relative flex flex-1 items-center justify-center bg-black/5 p-3 sm:p-6">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}
        {variant === 'video' ? (
          <video
            title={title}
            src={streamUrl}
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsInline
            className="max-h-[calc(100dvh-5rem)] w-full max-w-4xl rounded-lg bg-black shadow-lg"
            onLoadedData={() => setReady(true)}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <iframe
            title={title}
            src={streamUrl}
            className="h-[calc(100dvh-4rem)] w-full border-0 bg-white"
            onLoad={() => setReady(true)}
          />
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, ArrowLeft } from 'lucide-react'
import { PageBackButton } from '@/components/navigation/PageBackButton'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/fetchClient'
import { LibraryPdfViewer } from '@/components/library/LibraryPdfViewer'
import { cn } from '@/lib/utils'

const backButtonClassName = cn(
  'shrink-0 gap-1.5 border-violet-300/80 bg-background font-semibold text-violet-800 shadow-md',
  'hover:border-violet-400 hover:bg-indigo-50 hover:text-indigo-950',
  'dark:border-indigo-600 dark:bg-card dark:text-indigo-100 dark:hover:bg-indigo-950/70',
  'min-h-10 min-w-10'
)

type LibraryDocumentViewerProps = {
  title: string
  streamUrl: string
  backHref: string
  variant?: 'pdf' | 'video'
  productId?: string
  /** Volta in-page (ex.: curso vídeo → PDF) em vez de navegar */
  onBack?: () => void
}

export function LibraryDocumentViewer({
  title,
  streamUrl,
  backHref,
  variant = 'pdf',
  productId,
  onBack
}: LibraryDocumentViewerProps) {
  const [ready, setReady] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloadJobId, setDownloadJobId] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)

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

  useEffect(() => {
    if (!downloadJobId || !['pending', 'processing'].includes(downloadStatus ?? '')) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    const poll = async () => {
      try {
        const res = await apiFetch(`/api/library/download/status/${downloadJobId}`)
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'PDF_STATUS_FAILED')
        failures = 0
        setDownloadStatus(data.status)
        if (data.status === 'failed' || data.status === 'expired') {
          setDownloadError('Nao foi possivel preparar o PDF. Tente novamente.')
        } else if (data.status !== 'ready') {
          timer = setTimeout(poll, data.pollAfterMs ?? 2500)
        }
      } catch {
        failures += 1
        if (!cancelled && failures < 3) {
          timer = setTimeout(poll, failures * 2500)
        } else if (!cancelled) {
          setDownloadError('A conexao foi interrompida. Tente novamente.')
          setDownloadStatus('failed')
        }
      }
    }
    timer = setTimeout(poll, 1200)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [downloadJobId, downloadStatus])

  const handleDownload = async () => {
    if (!productId || downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      if (downloadJobId && downloadStatus === 'ready') {
        const urlResponse = await apiFetch(`/api/library/download/url/${downloadJobId}`, {
          method: 'POST'
        })
        const urlData = await urlResponse.json().catch(() => ({}))
        if (!urlResponse.ok || !urlData.downloadUrl) {
          throw new Error(urlData.error || 'PDF_DOWNLOAD_URL_FAILED')
        }
        window.location.assign(urlData.downloadUrl)
        return
      }

      const res = await apiFetch('/api/library/download/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          res.status === 404
            ? 'Download ainda não disponível neste ambiente. Aguarde a atualização do app.'
            : data.error === 'PDF_DOWNLOAD_QUOTA_EXCEEDED'
              ? data.message ||
                'Limite mensal de downloads atingido.'
              : data.message ||
                data.error ||
                'Não foi possível preparar o download.'
        setDownloadError(message)
        return
      }
      if (data.downloadUrl) {
        window.location.assign(data.downloadUrl)
        return
      }
      if (!data.jobId) {
        setDownloadError('Link de download indisponível.')
        return
      }
      setDownloadJobId(data.jobId)
      setDownloadStatus(data.status)
    } catch {
      setDownloadError('Erro de rede ao solicitar download.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-gradient-to-b from-violet-50 to-white dark:from-background dark:to-background"
      onContextMenu={(e) => e.preventDefault()}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-violet-100 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-border dark:bg-background/95 sm:gap-3 sm:px-4 sm:py-3">
        {onBack ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={backButtonClassName}
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-sm leading-none">Voltar</span>
          </Button>
        ) : (
          <PageBackButton href={backHref} showLabel className="shadow-sm" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        </div>
        {variant === 'pdf' && productId ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 border-violet-200 text-violet-800 dark:border-violet-800 dark:text-violet-200"
            disabled={downloading || downloadStatus === 'pending' || downloadStatus === 'processing'}
            onClick={() => void handleDownload()}
          >
            {downloading || downloadStatus === 'pending' || downloadStatus === 'processing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {downloadStatus === 'pending' || downloadStatus === 'processing'
                ? 'Preparando PDF...'
                : downloadStatus === 'ready'
                  ? 'Baixar PDF'
                  : downloadStatus === 'failed' || downloadStatus === 'expired'
                    ? 'Tentar novamente'
                    : 'Baixar PDF'}
            </span>
          </Button>
        ) : null}
      </header>

      {downloadError ? (
        <p className="px-4 py-2 text-center text-xs text-red-600 dark:text-red-400">
          {downloadError}
        </p>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-100 dark:bg-muted/30">
        {!ready && variant !== 'pdf' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-background/70">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        )}
        {variant === 'video' ? (
          <div className="flex flex-1 items-center justify-center p-3 sm:p-6">
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
          </div>
        ) : (
          <LibraryPdfViewer
            streamUrl={streamUrl}
            title={title}
            className="flex-1"
            onReady={() => setReady(true)}
            onError={() => setReady(true)}
          />
        )}
      </div>
    </div>
  )
}

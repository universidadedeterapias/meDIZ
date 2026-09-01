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

/**
 * Antes qualquer 404 virava "Download ainda não disponível neste ambiente",
 * o que mandava o usuário esperar uma atualização do app por um problema de
 * catálogo. Traduz o código real da API.
 */
function downloadErrorMessage(status: number, code?: string): string {
  switch (code) {
    case 'NO_PERMISSION_FOR_THIS_CONTENT':
      return 'Você não tem acesso a este material.'
    case 'PDF_SOURCE_NOT_CONFIGURED':
      return 'Este material ainda não tem PDF liberado para download. Fale com o suporte.'
    case 'PDF_MEDIA_NOT_FOUND':
      return 'Este material não está mais disponível. Recarregue a página e tente de novo.'
    case 'PRODUCT_NOT_FOUND':
      return 'Conteúdo não encontrado.'
    case 'PDF_SOURCE_TOO_LARGE':
      return 'Arquivo grande demais para gerar a cópia licenciada. Fale com o suporte.'
    case 'TOKEN_INVALID_OR_EXPIRED':
      return 'O link de download expirou. Tente novamente.'
    case 'PDF_DOWNLOAD_QUOTA_EXCEEDED':
      return 'Você atingiu o limite de downloads deste mês. Fale com o suporte.'
    case 'DOWNLOAD_GENERATION_FAILED':
      return 'Falha ao gerar a cópia licenciada. Tente novamente em alguns minutos.'
    default:
      return status >= 500
        ? 'Erro no servidor ao preparar o download. Tente novamente.'
        : 'Não foi possível preparar o download.'
  }
}

type LibraryDocumentViewerProps = {
  title: string
  streamUrl: string
  backHref: string
  variant?: 'pdf' | 'video'
  productId?: string
  /**
   * Material específico de curso (`CatalogModuleMedia.id`). Um produto VIDEO tem
   * vários PDFs; sem isso o download não sabe qual deles está aberto na tela.
   */
  mediaId?: string
  /** Volta in-page (ex.: curso vídeo → PDF) em vez de navegar */
  onBack?: () => void
}

export function LibraryDocumentViewer({
  title,
  streamUrl,
  backHref,
  variant = 'pdf',
  productId,
  mediaId,
  onBack
}: LibraryDocumentViewerProps) {
  const [ready, setReady] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

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

  /**
   * Espera a cópia ficar pronta, perguntando ao servidor.
   *
   * A marcação leva ~11s e antes acontecia dentro do próprio request de
   * download, com o arquivo inteiro sendo montado na memória do navegador. Era
   * isso que derrubava o celular: 21 MB (antes 147) num blob, sem retomada se a
   * rede oscilasse, e uma conexão aberta sem trafegar nada enquanto o servidor
   * marcava as páginas.
   */
  const esperaFicarPronto = async (statusUrl: string): Promise<string | null> => {
    const limite = Date.now() + 3 * 60_000

    while (Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 1500))

      const res = await apiFetch(statusUrl, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return downloadErrorMessage(res.status, data.error)

      if (data.estado === 'pronto') return null
      if (data.estado === 'falhou') {
        return downloadErrorMessage(500, 'DOWNLOAD_GENERATION_FAILED')
      }
      // `ausente` significa que o preparo se perdeu (deploy, reinício). A rota
      // de download sabe se virar sozinha nesse caso, então segue em frente.
      if (data.estado === 'ausente') return null
    }

    return 'A preparação está demorando mais que o normal. Tente de novo.'
  }

  const handleDownload = async () => {
    if (!productId || downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await apiFetch('/api/library/download/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ...(mediaId ? { mediaId } : {}) })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDownloadError(downloadErrorMessage(res.status, data.error))
        return
      }
      if (!data.downloadUrl) {
        setDownloadError('Link de download indisponível.')
        return
      }

      if (!data.pronto && data.statusUrl) {
        const erro = await esperaFicarPronto(data.statusUrl)
        if (erro) {
          setDownloadError(erro)
          return
        }
      }

      // Entrega para o navegador, que baixa direto para o disco: sem cópia na
      // memória, com barra de progresso de verdade e com retomada quando a rede
      // cai. Como a resposta vem com `Content-Disposition: attachment`, a página
      // atual não sai do lugar.
      window.location.href = data.downloadUrl
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
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {downloading ? 'Preparando PDF...' : 'Baixar PDF'}
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

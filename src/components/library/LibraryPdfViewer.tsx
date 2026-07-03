'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { cn } from '@/lib/utils'

type LibraryPdfViewerProps = {
  streamUrl: string
  title: string
  className?: string
  onReady?: () => void
  onError?: () => void
}

type PdfPageProps = {
  document: PDFDocumentProxy
  pageNumber: number
}

function PdfPage({ document, pageNumber }: PdfPageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const observer = new IntersectionObserver(
      entries => setVisible(entries.some(entry => entry.isIntersecting)),
      { rootMargin: '800px 0px' }
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const updateWidth = () => setWidth(Math.floor(host.clientWidth))
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || width <= 0 || !canvasRef.current) return

    let cancelled = false
    let renderTask: ReturnType<Awaited<ReturnType<typeof document.getPage>>['render']> | null = null

    async function renderPage() {
      const page = await document.getPage(pageNumber)
      if (cancelled || !canvasRef.current) return

      const baseViewport = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: width / baseViewport.width })
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`

      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]
      })
      await renderTask.promise
    }

    void renderPage().catch(error => {
      if (!cancelled && error?.name !== 'RenderingCancelledException') {
        console.error('[library/pdf-page]', error)
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [document, pageNumber, visible, width])

  return (
    <div ref={hostRef} className="mx-auto min-h-[60vh] w-full max-w-5xl bg-white shadow-sm">
      <canvas ref={canvasRef} className="mx-auto block max-w-full" />
    </div>
  )
}

export function LibraryPdfViewer({
  streamUrl,
  title,
  className,
  onReady,
  onError
}: LibraryPdfViewerProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const readyRef = useRef(onReady)
  const errorRef = useRef(onError)

  useEffect(() => {
    readyRef.current = onReady
    errorRef.current = onError
  }, [onReady, onError])

  useEffect(() => {
    let cancelled = false
    let loadedDocument: PDFDocumentProxy | null = null
    let loadingTask: { destroy: () => Promise<void> } | null = null

    setLoading(true)
    setError(false)
    setDocument(null)

    async function loadPdf() {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const task = pdfjs.getDocument({
          url: streamUrl,
          withCredentials: true,
          disableAutoFetch: false,
          disableStream: false
        })
        loadingTask = task
        const pdf = await task.promise
        loadedDocument = pdf

        if (cancelled) {
          await pdf.destroy()
          return
        }

        setDocument(pdf)
        setLoading(false)
        readyRef.current?.()
      } catch (loadError) {
        if (!cancelled) {
          console.error('[library/pdf-viewer]', loadError)
          setLoading(false)
          setError(true)
          errorRef.current?.()
        }
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      setDocument(null)
      if (loadedDocument) {
        void loadedDocument.destroy()
      } else if (loadingTask) {
        void loadingTask.destroy()
      }
    }
  }, [streamUrl])

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

  return (
    <div
      aria-label={title}
      className={cn('relative h-full min-h-0 w-full min-w-0 overflow-y-auto bg-neutral-100', className)}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : null}

      {document ? (
        <div className="space-y-3 p-2 sm:p-4">
          {Array.from({ length: document.numPages }, (_, index) => (
            <PdfPage key={index + 1} document={document} pageNumber={index + 1} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

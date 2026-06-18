'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FileText, Headphones, Loader2 } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { AudioterapiaPlayer } from '@/components/audioterapia/AudioterapiaPlayer'
import { LibraryDocumentViewer } from '@/components/library/LibraryDocumentViewer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'
import { cn } from '@/lib/utils'

type MediaItem = { id: string; url: string; title?: string }

type ModuleMedia = {
  videos: MediaItem[]
  pdfs: MediaItem[]
  audios: MediaItem[]
}

type CourseModule = {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  sortOrder: number
  media: ModuleMedia
}

type CourseMaterials = {
  modules: CourseModule[]
  video: { url: string; title?: string } | null
  pdf: { url: string; title?: string } | null
}

function normalizeModuleMedia(raw: unknown): ModuleMedia {
  if (!raw || typeof raw !== 'object') {
    return { videos: [], pdfs: [], audios: [] }
  }
  const m = raw as Record<string, unknown>
  const toList = (value: unknown): MediaItem[] => {
    if (Array.isArray(value)) {
      return value
        .filter((item) => item && typeof item === 'object' && 'url' in item)
        .map((item) => {
          const row = item as { id?: string; url: string; title?: string }
          return {
            id: row.id ?? row.url,
            url: row.url,
            title: row.title
          }
        })
    }
    if (value && typeof value === 'object' && 'url' in value) {
      const row = value as { id?: string; url: string; title?: string }
      return [{ id: row.id ?? row.url, url: row.url, title: row.title }]
    }
    return []
  }
  return {
    videos: toList(m.videos ?? m.video),
    pdfs: toList(m.pdfs ?? m.pdf),
    audios: toList(m.audios ?? m.audio)
  }
}

export default function CursosLeitorPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [materials, setMaterials] = useState<CourseMaterials | null>(null)
  const [activeModuleIndex, setActiveModuleIndex] = useState(0)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [activePdfIndex, setActivePdfIndex] = useState(0)
  const [activeAudioIndex, setActiveAudioIndex] = useState(0)
  const [showPdf, setShowPdf] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const modules = useMemo(
    () => materials?.modules ?? [],
    [materials?.modules]
  )

  const activeModule = modules[activeModuleIndex] ?? null
  const videos = activeModule?.media.videos ?? []
  const pdfs = activeModule?.media.pdfs ?? []
  const audios = activeModule?.media.audios ?? []
  const video = videos[activeVideoIndex] ?? videos[0] ?? null
  const pdf = pdfs[activePdfIndex] ?? pdfs[0] ?? null
  const audio = audios[activeAudioIndex] ?? audios[0] ?? null

  const loadCourse = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)

    try {
      const productRes = await apiFetch(`/api/catalog/products/${productId}`, {
        cache: 'no-store'
      })
      if (productRes.status === 401) {
        router.push('/login')
        return
      }
      if (!productRes.ok) throw new Error('product_not_found')

      const productData = await productRes.json()
      const loadedProduct = productData.product as CatalogProductOffer | null

      if (loadedProduct?.permissionKey !== 'VIDEO') {
        router.replace(`/biblioteca/leitor/${productId}`)
        return
      }

      setProduct(loadedProduct)

      if (!loadedProduct?.unlocked) {
        setError('locked')
        return
      }

      const mediaRes = await apiFetch(
        `/api/catalog/products/${productId}/media?list=1`,
        { cache: 'no-store' }
      )
      if (!mediaRes.ok) throw new Error('media_not_available')

      const mediaData = (await mediaRes.json()) as CourseMaterials & {
        modules?: Array<{ media?: unknown }>
      }

      const normalizedModules: CourseModule[] = (mediaData.modules ?? []).map(
        (mod) => ({
          ...(mod as CourseModule),
          media: normalizeModuleMedia(mod.media)
        })
      )

      const hasModules = normalizedModules.length > 0
      const hasLegacy = !!mediaData.video?.url || !!mediaData.pdf?.url
      const hasModuleContent =
        hasModules &&
        normalizedModules.some(
          (m) =>
            m.media.videos.length > 0 ||
            m.media.pdfs.length > 0 ||
            m.media.audios.length > 0
        )

      if (!hasModuleContent && !hasLegacy) {
        throw new Error('media_not_available')
      }

      if (!hasModules && (mediaData.video || mediaData.pdf)) {
        normalizedModules.push({
          id: 'legacy',
          title: loadedProduct.title,
          description: loadedProduct.description,
          coverImageUrl: loadedProduct.coverImageUrl,
          sortOrder: 0,
          media: {
            videos: mediaData.video
              ? [
                  {
                    id: 'legacy-video',
                    url: mediaData.video.url,
                    title: mediaData.video.title
                  }
                ]
              : [],
            pdfs: mediaData.pdf
              ? [
                  {
                    id: 'legacy-pdf',
                    url: mediaData.pdf.url,
                    title: mediaData.pdf.title
                  }
                ]
              : [],
            audios: []
          }
        })
      }

      setMaterials({ ...mediaData, modules: normalizedModules })
      setActiveModuleIndex(0)
      setActiveVideoIndex(0)
      setActivePdfIndex(0)
      setActiveAudioIndex(0)
    } catch {
      setError('load_failed')
    } finally {
      setLoading(false)
    }
  }, [productId, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      void loadCourse()
    }
  }, [status, router, loadCourse])

  useEffect(() => {
    setShowPdf(false)
    setShowAudio(false)
    setActiveVideoIndex(0)
    setActivePdfIndex(0)
    setActiveAudioIndex(0)
  }, [activeModuleIndex])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-emerald-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error === 'locked' && product) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            'library.error.noPermission',
            'Você ainda não tem permissão para este conteúdo.'
          )}
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() =>
            window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
          }
        >
          {t('catalog.action.unlock', 'Desbloquear acesso')}
        </Button>
        <Button variant="outline" onClick={() => router.push('/cursos')}>
          {t('cursos.back', 'Voltar')}
        </Button>
      </div>
    )
  }

  if (!product || !materials || error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('cursos.error.open', 'Não foi possível abrir o curso.')}
        </p>
        <Button variant="outline" onClick={() => router.push('/cursos')}>
          {t('cursos.back', 'Voltar')}
        </Button>
      </div>
    )
  }

  if (showPdf && pdf?.url) {
    return (
      <LibraryDocumentViewer
        title={pdf.title ?? activeModule?.title ?? product.title}
        streamUrl={pdf.url}
        backHref="/cursos"
        variant="pdf"
        productId={productId}
        onBack={() => setShowPdf(false)}
      />
    )
  }

  if (showAudio && audio?.url) {
    return (
      <AudioterapiaPlayer
        coverSrc={activeModule?.coverImageUrl ?? product.imageSrc}
        productTitle={product.title}
        trackTitle={audio.title ?? activeModule?.title ?? ''}
        tagLabel={product.tagLabel ?? t('cursos.audioTag', 'Áudio')}
        author=""
        mediaUrl={audio.url}
        hasPrev={activeModuleIndex > 0 || activeAudioIndex > 0}
        hasNext={
          activeModuleIndex < modules.length - 1 ||
          activeAudioIndex < audios.length - 1
        }
        onPrev={() => {
          if (activeAudioIndex > 0) {
            setActiveAudioIndex((i) => i - 1)
          } else if (activeModuleIndex > 0) {
            setActiveModuleIndex((i) => i - 1)
          }
        }}
        onNext={() => {
          if (activeAudioIndex < audios.length - 1) {
            setActiveAudioIndex((i) => i + 1)
          } else if (activeModuleIndex < modules.length - 1) {
            setActiveModuleIndex((i) => i + 1)
          }
        }}
        backHref="/cursos"
      />
    )
  }

  const topOffset = modules.length > 1 || videos.length > 1

  if (!video?.url) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <CourseNav
          modules={modules}
          activeModuleIndex={activeModuleIndex}
          onModuleSelect={setActiveModuleIndex}
          videos={videos}
          activeVideoIndex={activeVideoIndex}
          onVideoSelect={setActiveVideoIndex}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('cursos.error.video', 'Vídeo ainda não disponível neste módulo.')}
          </p>
          {pdfs.length > 0 && (
            <Button onClick={() => setShowPdf(true)}>
              <FileText className="mr-2 h-4 w-4" />
              {t('cursos.openPdf', 'Abrir material PDF')}
            </Button>
          )}
          {audios.length > 0 && (
            <Button variant="secondary" onClick={() => setShowAudio(true)}>
              <Headphones className="mr-2 h-4 w-4" />
              {t('cursos.openAudio', 'Ouvir áudio')}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push('/cursos')}>
            {t('cursos.back', 'Voltar')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh]">
      <div className="absolute left-0 right-0 top-0 z-20 border-b bg-background/95 px-2 py-2 backdrop-blur sm:px-4">
        <CourseNav
          modules={modules}
          activeModuleIndex={activeModuleIndex}
          onModuleSelect={setActiveModuleIndex}
          videos={videos}
          activeVideoIndex={activeVideoIndex}
          onVideoSelect={setActiveVideoIndex}
        />
      </div>

      <div
        className={cn(
          'absolute right-3 z-20 flex flex-wrap gap-2 sm:right-4',
          topOffset ? 'top-20 sm:top-24' : 'top-3 sm:top-4'
        )}
      >
        {pdfs.length > 0 && (
          <PdfPicker
            pdfs={pdfs}
            activeIndex={activePdfIndex}
            onSelect={(i) => {
              setActivePdfIndex(i)
              setShowPdf(true)
            }}
          />
        )}
        {audios.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md"
            onClick={() => setShowAudio(true)}
          >
            <Headphones className="mr-2 h-4 w-4" />
            {audios.length > 1
              ? `${t('cursos.openAudio', 'Áudio')} (${activeAudioIndex + 1}/${audios.length})`
              : t('cursos.openAudio', 'Áudio')}
          </Button>
        )}
      </div>

      <AudioterapiaPlayer
        coverSrc={activeModule?.coverImageUrl ?? product.imageSrc}
        productTitle={product.title}
        trackTitle={video.title ?? activeModule?.title ?? product.description ?? ''}
        tagLabel={product.tagLabel ?? t('cursos.videoTag', 'Vídeo')}
        author=""
        mediaUrl={video.url}
        isVideo
        showVideoInFrame
        hasPrev={activeModuleIndex > 0 || activeVideoIndex > 0}
        hasNext={
          activeModuleIndex < modules.length - 1 ||
          activeVideoIndex < videos.length - 1
        }
        onPrev={() => {
          if (activeVideoIndex > 0) {
            setActiveVideoIndex((i) => i - 1)
          } else if (activeModuleIndex > 0) {
            setActiveModuleIndex((i) => i - 1)
          }
        }}
        onNext={() => {
          if (activeVideoIndex < videos.length - 1) {
            setActiveVideoIndex((i) => i + 1)
          } else if (activeModuleIndex < modules.length - 1) {
            setActiveModuleIndex((i) => i + 1)
          }
        }}
        backHref="/cursos"
      />
    </div>
  )
}

function CourseNav({
  modules,
  activeModuleIndex,
  onModuleSelect,
  videos,
  activeVideoIndex,
  onVideoSelect
}: {
  modules: CourseModule[]
  activeModuleIndex: number
  onModuleSelect: (index: number) => void
  videos: MediaItem[]
  activeVideoIndex: number
  onVideoSelect: (index: number) => void
}) {
  return (
    <div className="space-y-2">
      {modules.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {modules.map((mod, index) => (
            <Button
              key={mod.id}
              type="button"
              size="sm"
              variant={index === activeModuleIndex ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => onModuleSelect(index)}
            >
              {mod.title}
            </Button>
          ))}
        </div>
      )}
      {videos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {videos.map((item, index) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={index === activeVideoIndex ? 'secondary' : 'ghost'}
              className="shrink-0 text-xs"
              onClick={() => onVideoSelect(index)}
            >
              {item.title ?? `Vídeo ${index + 1}`}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

function PdfPicker({
  pdfs,
  activeIndex,
  onSelect
}: {
  pdfs: MediaItem[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  if (pdfs.length === 1) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="shadow-md"
        onClick={() => onSelect(0)}
      >
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {pdfs.map((item, index) => (
        <Button
          key={item.id}
          size="sm"
          variant={index === activeIndex ? 'default' : 'secondary'}
          className="shadow-md text-xs"
          onClick={() => onSelect(index)}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          {item.title ?? `PDF ${index + 1}`}
        </Button>
      ))}
    </div>
  )
}

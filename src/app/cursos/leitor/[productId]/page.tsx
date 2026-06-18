'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FileText, Headphones, Loader2, Play } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { AudioterapiaPlayer } from '@/components/audioterapia/AudioterapiaPlayer'
import { LibraryDocumentViewer } from '@/components/library/LibraryDocumentViewer'
import { PageBackButton } from '@/components/navigation/PageBackButton'
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

type VideoPlaylistItem = {
  key: string
  moduleIndex: number
  videoIndex: number
  moduleTitle: string
  title: string
  url: string
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

function buildVideoPlaylist(modules: CourseModule[]): VideoPlaylistItem[] {
  const list: VideoPlaylistItem[] = []
  modules.forEach((mod, moduleIndex) => {
    mod.media.videos.forEach((video, videoIndex) => {
      if (!video.url) return
      list.push({
        key: `${mod.id}-${video.id}-${videoIndex}`,
        moduleIndex,
        videoIndex,
        moduleTitle: mod.title,
        title: video.title ?? `Vídeo ${videoIndex + 1}`,
        url: video.url
      })
    })
  })
  return list
}

export default function CursosLeitorPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [materials, setMaterials] = useState<CourseMaterials | null>(null)
  const [playlistIndex, setPlaylistIndex] = useState(0)
  const [showPdf, setShowPdf] = useState<{ url: string; title: string } | null>(
    null
  )
  const [showAudio, setShowAudio] = useState<{
    url: string
    title: string
    moduleIndex: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const modules = useMemo(
    () => materials?.modules ?? [],
    [materials?.modules]
  )

  const playlist = useMemo(() => buildVideoPlaylist(modules), [modules])
  const current = playlist[playlistIndex] ?? null
  const activeModule = current
    ? (modules[current.moduleIndex] ?? null)
    : (modules[0] ?? null)

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

      const hasLegacy = !!mediaData.video?.url || !!mediaData.pdf?.url
      const hasModuleContent = normalizedModules.some(
        (m) =>
          m.media.videos.length > 0 ||
          m.media.pdfs.length > 0 ||
          m.media.audios.length > 0
      )

      if (!hasModuleContent && !hasLegacy) {
        throw new Error('media_not_available')
      }

      if (normalizedModules.length === 0 && hasLegacy) {
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
      setPlaylistIndex(0)
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

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
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
          className="bg-violet-600 hover:bg-violet-700"
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

  if (showPdf) {
    return (
      <LibraryDocumentViewer
        title={showPdf.title}
        streamUrl={showPdf.url}
        backHref="/cursos"
        variant="pdf"
        productId={productId}
        onBack={() => setShowPdf(null)}
      />
    )
  }

  if (showAudio) {
    const mod = modules[showAudio.moduleIndex]
    return (
      <AudioterapiaPlayer
        coverSrc={mod?.coverImageUrl ?? product.imageSrc}
        productTitle={product.title}
        trackTitle={showAudio.title}
        tagLabel={product.tagLabel ?? t('cursos.audioTag', 'Áudio')}
        author=""
        mediaUrl={showAudio.url}
        hasPrev={false}
        hasNext={false}
        onPrev={() => {}}
        onNext={() => {}}
        backHref="/cursos"
      />
    )
  }

  const goToPlaylistIndex = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setPlaylistIndex(index)
      setShowPdf(null)
      setShowAudio(null)
    }
  }

  const sidebar = (
    <CourseSidebar
      modules={modules}
      playlist={playlist}
      playlistIndex={playlistIndex}
      onSelectVideo={goToPlaylistIndex}
      onOpenPdf={(pdf, moduleTitle) =>
        setShowPdf({
          url: pdf.url,
          title: pdf.title ?? moduleTitle
        })
      }
      onOpenAudio={(audio, moduleIndex) =>
        setShowAudio({
          url: audio.url,
          title: audio.title ?? 'Áudio',
          moduleIndex
        })
      }
    />
  )

  if (!current?.url) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background lg:flex-row">
        <aside className="border-b lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b px-3 py-3">
            <PageBackButton href="/cursos" showLabel className="shadow-sm" />
            <p className="min-w-0 truncate text-sm font-semibold">
              {product.title}
            </p>
          </div>
          {sidebar}
        </aside>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              'cursos.error.video',
              'Nenhum vídeo disponível. Abra um PDF ou áudio na lista ao lado.'
            )}
          </p>
          <Button variant="outline" onClick={() => router.push('/cursos')}>
            {t('cursos.back', 'Voltar')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:flex-row">
      <aside className="max-h-[40vh] overflow-y-auto border-b lg:max-h-none lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 px-3 py-3 backdrop-blur">
          <PageBackButton href="/cursos" showLabel className="shadow-sm" />
          <p className="min-w-0 truncate text-sm font-semibold">
            {product.title}
          </p>
        </div>
        {sidebar}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <AudioterapiaPlayer
          key={current.key}
          coverSrc={activeModule?.coverImageUrl ?? product.imageSrc}
          productTitle={product.title}
          trackTitle={`${current.moduleTitle} · ${current.title}`}
          tagLabel={product.tagLabel ?? t('cursos.videoTag', 'Vídeo')}
          author=""
          mediaUrl={current.url}
          isVideo
          showVideoInFrame
          frameAspect="video"
          videoFit="contain"
          maxFrameClassName="w-full"
          showHeader={false}
          fillContainer
          hasPrev={playlistIndex > 0}
          hasNext={playlistIndex < playlist.length - 1}
          onPrev={() => goToPlaylistIndex(playlistIndex - 1)}
          onNext={() => goToPlaylistIndex(playlistIndex + 1)}
          backHref="/cursos"
        />
      </div>
    </div>
  )
}

function CourseSidebar({
  modules,
  playlist,
  playlistIndex,
  onSelectVideo,
  onOpenPdf,
  onOpenAudio
}: {
  modules: CourseModule[]
  playlist: VideoPlaylistItem[]
  playlistIndex: number
  onSelectVideo: (playlistIndex: number) => void
  onOpenPdf: (pdf: MediaItem, moduleTitle: string) => void
  onOpenAudio: (audio: MediaItem, moduleIndex: number) => void
}) {
  const { t } = useTranslation()

  return (
    <nav className="space-y-3 p-3" aria-label="Conteúdo do curso">
      {modules.map((mod, moduleIndex) => {
        const moduleVideos = playlist.filter((p) => p.moduleIndex === moduleIndex)
        const hasMedia =
          moduleVideos.length > 0 ||
          mod.media.pdfs.length > 0 ||
          mod.media.audios.length > 0
        if (!hasMedia) return null

        return (
          <div key={mod.id} className="rounded-lg border bg-card p-2">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {mod.title}
            </p>
            <ul className="space-y-1">
              {moduleVideos.map((item) => {
                const globalIndex = playlist.findIndex((p) => p.key === item.key)
                const active = globalIndex === playlistIndex
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onSelectVideo(globalIndex)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-violet-600 text-white'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Play className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug">
                          {item.title}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {mod.media.pdfs.map((pdf) => (
                <li key={pdf.id}>
                  <button
                    type="button"
                    onClick={() => onOpenPdf(pdf, mod.title)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-violet-600" />
                    <span className="truncate">
                      {pdf.title ?? t('cursos.openPdf', 'Material PDF')}
                    </span>
                  </button>
                </li>
              ))}
              {mod.media.audios.map((audio) => (
                <li key={audio.id}>
                  <button
                    type="button"
                    onClick={() => onOpenAudio(audio, moduleIndex)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Headphones className="h-4 w-4 shrink-0 text-violet-600" />
                    <span className="truncate">
                      {audio.title ?? t('cursos.openAudio', 'Áudio')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

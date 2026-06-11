'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Lock } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { AudioterapiaPlayer } from '@/components/audioterapia/AudioterapiaPlayer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

export default function AudioterapiaPlayPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const productId = String(params.productId ?? '')
  const trackIndex = Number.parseInt(searchParams.get('index') ?? '0', 10)
  const { status } = useSession()
  const { t } = useTranslation()

  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tracks = useMemo(
    () =>
      [...(product?.mediaItems ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder
      ),
    [product?.mediaItems]
  )

  const currentTrackIndex = useMemo(() => {
    if (tracks.length === 0) return -1
    const bySort = tracks.findIndex((t) => t.sortOrder === trackIndex)
    return bySort >= 0 ? bySort : 0
  }, [tracks, trackIndex])

  const currentTrack =
    currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null

  const loadPlayback = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError(null)
    setMediaUrl(null)

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
      setProduct(loadedProduct)

      if (!loadedProduct?.unlocked) {
        setError('locked')
        return
      }

      const index =
        Number.isNaN(trackIndex) || trackIndex < 0 ? 0 : trackIndex

      const mediaRes = await apiFetch(
        `/api/catalog/products/${productId}/media?index=${index}`,
        { cache: 'no-store' }
      )
      if (!mediaRes.ok) throw new Error('media_not_available')
      const mediaData = await mediaRes.json()
      if (!mediaData.url) throw new Error('media_not_available')
      setMediaUrl(mediaData.url)
    } catch {
      setError('load_failed')
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [productId, trackIndex, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      void loadPlayback()
    }
  }, [status, router, loadPlayback])

  const goToTrack = (nextIndex: number) => {
    const track = tracks[nextIndex]
    if (!track) return
    router.push(
      `/audioterapia/${productId}/play?index=${track.sortOrder}`
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-gradient-to-b from-violet-100 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-muted-foreground">
          {t('audioterapia.loading', 'Carregando audioterapia...')}
        </p>
      </div>
    )
  }

  if (error === 'locked' && product) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-gradient-to-b from-violet-100 to-white px-6 text-center">
        <Lock className="h-10 w-10 text-violet-600" />
        <p className="text-sm text-muted-foreground">
          {t('audioterapia.lockedHint', 'Adquira para ouvir agora')}
        </p>
        <Button
          className="bg-violet-600 hover:bg-violet-700"
          onClick={() =>
            window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
          }
        >
          {t('catalog.action.unlock', 'Desbloquear acesso')}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/audioterapia/${productId}`)}
        >
          Voltar
        </Button>
      </div>
    )
  }

  if (!product || !mediaUrl || !currentTrack || error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-gradient-to-b from-violet-100 to-white px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            'audioterapia.error.open',
            'Não foi possível abrir a audioterapia.'
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/audioterapia/${productId}`)}
        >
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <AudioterapiaPlayer
      coverSrc={product.imageSrc}
      productTitle={product.title}
      trackTitle={currentTrack.title}
      tagLabel={product.tagLabel ?? 'Audioterapia guiada'}
      mediaUrl={mediaUrl}
      isVideo={/\.mp4(\?|$)/i.test(currentTrack.mediaFileName)}
      hasPrev={currentTrackIndex > 0}
      hasNext={currentTrackIndex < tracks.length - 1}
      onPrev={() => goToTrack(currentTrackIndex - 1)}
      onNext={() => goToTrack(currentTrackIndex + 1)}
      backHref={`/audioterapia/${productId}`}
    />
  )
}

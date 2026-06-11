'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { AudioterapiaPlayer } from '@/components/audioterapia/AudioterapiaPlayer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

export default function CursosLeitorPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVideo = useCallback(async () => {
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
        `/api/catalog/products/${productId}/media`,
        { cache: 'no-store' }
      )
      if (!mediaRes.ok) throw new Error('media_not_available')

      const mediaData = await mediaRes.json()
      if (!mediaData.url) throw new Error('media_not_available')
      setStreamUrl(mediaData.url)
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
      void loadVideo()
    }
  }, [status, router, loadVideo])

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

  if (!product || !streamUrl || error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('cursos.error.open', 'Não foi possível abrir o vídeo.')}
        </p>
        <Button variant="outline" onClick={() => router.push('/cursos')}>
          {t('cursos.back', 'Voltar')}
        </Button>
      </div>
    )
  }

  return (
    <AudioterapiaPlayer
      coverSrc={product.imageSrc}
      productTitle={product.title}
      trackTitle={product.description ?? ''}
      tagLabel={product.tagLabel ?? t('cursos.videoTag', 'Vídeo')}
      author=""
      mediaUrl={streamUrl}
      isVideo
      showVideoInFrame
      hasPrev={false}
      hasNext={false}
      onPrev={() => {}}
      onNext={() => {}}
      backHref="/cursos"
    />
  )
}

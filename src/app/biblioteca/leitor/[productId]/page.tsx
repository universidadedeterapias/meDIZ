'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { LibraryDocumentViewer } from '@/components/library/LibraryDocumentViewer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

export default function BibliotecaLeitorPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
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

      if (loadedProduct?.permissionKey === 'VIDEO') {
        router.replace(`/cursos/leitor/${productId}`)
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
      if (mediaData.mediaKind === 'video') {
        router.replace(`/cursos/leitor/${productId}`)
        return
      }
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
      void loadDocument()
    }
  }, [status, router, loadDocument])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-violet-50">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (error === 'locked' && product) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('library.error.noPermission', 'Você ainda não tem permissão para este conteúdo.')}
        </p>
        <Button
          className="bg-violet-600 hover:bg-violet-700"
          onClick={() =>
            window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
          }
        >
          {t('catalog.action.unlock', 'Desbloquear acesso')}
        </Button>
        <Button variant="outline" onClick={() => router.push('/biblioteca')}>
          Voltar
        </Button>
      </div>
    )
  }

  if (!product || !streamUrl || error) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('library.error.open', 'Não foi possível abrir o conteúdo.')}
        </p>
        <Button variant="outline" onClick={() => router.push('/biblioteca')}>
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <LibraryDocumentViewer
      title={product.title}
      streamUrl={streamUrl}
      backHref="/biblioteca"
      variant="pdf"
      productId={productId}
    />
  )
}

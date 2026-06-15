'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FileText, Loader2 } from 'lucide-react'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { AudioterapiaPlayer } from '@/components/audioterapia/AudioterapiaPlayer'
import { LibraryDocumentViewer } from '@/components/library/LibraryDocumentViewer'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

type CourseMaterials = {
  video: { url: string; title?: string } | null
  pdf: { url: string; title?: string } | null
}

export default function CursosLeitorPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [materials, setMaterials] = useState<CourseMaterials | null>(null)
  const [showPdf, setShowPdf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      const mediaData = (await mediaRes.json()) as CourseMaterials
      if (!mediaData.video?.url && !mediaData.pdf?.url) {
        throw new Error('media_not_available')
      }
      setMaterials(mediaData)
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

  if (showPdf && materials.pdf?.url) {
    return (
      <LibraryDocumentViewer
        title={materials.pdf.title ?? product.title}
        streamUrl={materials.pdf.url}
        backHref="/cursos"
        variant="pdf"
        productId={productId}
        onBack={() => setShowPdf(false)}
      />
    )
  }

  if (!materials.video?.url) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('cursos.error.video', 'Vídeo ainda não disponível para este curso.')}
        </p>
        {materials.pdf?.url && (
          <Button onClick={() => setShowPdf(true)}>
            <FileText className="mr-2 h-4 w-4" />
            {t('cursos.openPdf', 'Abrir material PDF')}
          </Button>
        )}
        <Button variant="outline" onClick={() => router.push('/cursos')}>
          {t('cursos.back', 'Voltar')}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100dvh]">
      {materials.pdf?.url && (
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md"
            onClick={() => setShowPdf(true)}
          >
            <FileText className="mr-2 h-4 w-4" />
            {t('cursos.openPdf', 'Material PDF')}
          </Button>
        </div>
      )}
      <AudioterapiaPlayer
        coverSrc={product.imageSrc}
        productTitle={product.title}
        trackTitle={product.description ?? ''}
        tagLabel={product.tagLabel ?? t('cursos.videoTag', 'Vídeo')}
        author=""
        mediaUrl={materials.video.url}
        isVideo
        showVideoInFrame
        hasPrev={false}
        hasNext={false}
        onPrev={() => {}}
        onNext={() => {}}
        backHref="/cursos"
      />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { ProductOfferList } from '@/components/library/ProductOfferList'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { Button } from '@/components/ui/button'
import { AppPageHeader } from '@/components/navigation/AppPageHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

export default function CursosPage() {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useTranslation()
  const [products, setProducts] = useState<CatalogProductOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadingLabel = t('cursos.opening', 'Abrindo...')

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/catalog/products?section=CURSOS', {
        cache: 'no-store'
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      setProducts(data.products ?? [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      loadCatalog()
    }
  }, [status, router, loadCatalog])

  useEffect(() => {
    pollRef.current = setInterval(() => {
      loadCatalog()
    }, 30000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [loadCatalog])

  const handleUnlock = (product: CatalogProductOffer) => {
    window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
  }

  const handleAccess = (product: CatalogProductOffer) => {
    if (!product.unlocked) {
      handleUnlock(product)
      return
    }
    setOpeningId(product.id)
    router.push(`/cursos/leitor/${product.id}`)
    setOpeningId(null)
  }

  if (
    status === 'loading' ||
    (status === 'authenticated' && loading && products.length === 0)
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">
          {t('cursos.loading', 'Carregando cursos...')}
        </p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-muted/30">
          <AppPageHeader backFallback="/chat">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 border-emerald-200 px-2 text-emerald-700 sm:h-9 sm:px-3"
              onClick={loadCatalog}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </AppPageHeader>

          <main className="flex-1 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
            <ProductOfferList
              pageTitle={t('cursos.pageTitle', 'Cursos')}
              pageSubtitle={t(
                'cursos.pageSubtitle',
                'Vídeos disponíveis no app'
              )}
              products={products}
              openingId={openingId}
              loadingLabel={loadingLabel}
              onUnlock={handleUnlock}
              onAccess={handleAccess}
            />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

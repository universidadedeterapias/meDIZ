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

type CachedPdf = { url: string; label: string }

export default function BibliotecaPage() {
  const router = useRouter()
  const { status } = useSession()
  const { t } = useTranslation()
  const [products, setProducts] = useState<CatalogProductOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadingLabel = t('library.opening', 'Abrindo...')

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/catalog/products?section=BIBLIOTECA', {
        cache: 'no-store'
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      let list: CatalogProductOffer[] = data.products ?? []

      const hasPdfUnlocked = list.some(
        (p) => p.permissionKey === 'PDF' && p.unlocked
      )

      const pdfTitles: Record<number, string> = {}
      if (hasPdfUnlocked) {
        try {
          const pdfRes = await apiFetch('/api/biblioteca/pdf', {
            cache: 'no-store'
          })
          if (pdfRes.ok) {
            const pdfData = await pdfRes.json()
            if (Array.isArray(pdfData.urls) && pdfData.urls.length > 0) {
              pdfData.urls.forEach((tile: CachedPdf, i: number) => {
                pdfTitles[i] = tile.label
              })
            }
          }
        } catch {
          // ignore
        }
      }

      list = list.map((p) =>
        p.permissionKey === 'PDF' && pdfTitles[p.pdfIndex]
          ? { ...p, title: pdfTitles[p.pdfIndex] }
          : p
      )

      setProducts(list)
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

  const openUrl = async (apiPath: string, productId: string) => {
    setOpeningId(productId)
    try {
      const res = await apiFetch(apiPath, { cache: 'no-store' })
      if (!res.ok) throw new Error('access_failed')
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      alert(t('library.error.open', 'Não foi possível abrir o conteúdo.'))
    } finally {
      setOpeningId(null)
    }
  }

  const handleUnlock = (product: CatalogProductOffer) => {
    window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
  }

  const handleAccess = (product: CatalogProductOffer) => {
    openUrl(`/api/catalog/products/${product.id}/media`, product.id)
  }

  if (status === 'loading' || (status === 'authenticated' && loading && products.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-muted-foreground">
          {t('library.loading', 'Carregando biblioteca...')}
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
              className="h-8 shrink-0 border-indigo-200 px-2 text-indigo-700 sm:h-9 sm:px-3"
              onClick={loadCatalog}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </AppPageHeader>

          <main className="flex-1 overflow-x-hidden px-3 py-4 sm:px-4 sm:py-6">
            <ProductOfferList
              pageTitle={t('library.pageTitle', 'Biblioteca')}
              pageSubtitle={t(
                'library.pageSubtitle',
                'Conteúdos disponíveis no app'
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

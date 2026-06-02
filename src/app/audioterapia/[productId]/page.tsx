'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Headphones, Loader2, Lock } from 'lucide-react'
import Image from 'next/image'
import { AppSidebar } from '@/components/app-sidebar'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { groupMediaItemsByLocale } from '@/lib/catalog/media-items'
import { Button } from '@/components/ui/button'
import { AppPageHeader } from '@/components/navigation/AppPageHeader'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { apiFetch } from '@/lib/fetchClient'

export default function AudioterapiaProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = String(params.productId ?? '')
  const { status } = useSession()
  const { t } = useTranslation()
  const [product, setProduct] = useState<CatalogProductOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [openingTrack, setOpeningTrack] = useState<number | null>(null)

  const loadProduct = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    try {
      const res = await apiFetch(`/api/catalog/products/${productId}`, {
        cache: 'no-store'
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) throw new Error('fetch_failed')
      const data = await res.json()
      setProduct(data.product ?? null)
    } catch {
      setProduct(null)
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
      loadProduct()
    }
  }, [status, router, loadProduct])

  const openTrack = async (sortOrder: number) => {
    if (!product?.unlocked) {
      window.open(product?.purchaseUrl, '_blank', 'noopener,noreferrer')
      return
    }

    setOpeningTrack(sortOrder)
    try {
      const res = await apiFetch(
        `/api/catalog/products/${productId}/media?index=${sortOrder}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('access_failed')
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      alert(
        t('audioterapia.error.open', 'Não foi possível abrir a audioterapia.')
      )
    } finally {
      setOpeningTrack(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <p className="text-sm text-muted-foreground">
          {t('audioterapia.loading', 'Carregando audioterapia...')}
        </p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">
          {t('audioterapia.notFound', 'Audioterapia não encontrada.')}
        </p>
        <Button variant="outline" onClick={() => router.push('/audioterapia')}>
          {t('audioterapia.backToList', 'Voltar à lista')}
        </Button>
      </div>
    )
  }

  const tracks = product.mediaItems ?? []
  const groups = groupMediaItemsByLocale(tracks)
  const trackCount = tracks.length

  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset>
        <div className="flex min-h-screen flex-col bg-muted/30">
          <AppPageHeader backFallback="/audioterapia" />

          <main className="mx-auto w-full max-w-lg flex-1 space-y-5 px-3 py-4 sm:px-4 sm:py-6">
            <article className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
              <div className="flex justify-center px-4 pt-4 sm:pt-5">
                <div className="relative aspect-square w-44 overflow-hidden rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-950 dark:to-indigo-950 sm:w-52">
                  <Image
                    src={product.imageSrc}
                    alt={product.title}
                    fill
                    className="object-contain p-1.5"
                    sizes="208px"
                  />
                </div>
              </div>

              <div className="px-4 pb-4 pt-3 sm:px-5">
                <h1 className="text-center text-lg font-bold text-foreground sm:text-xl">
                  {product.title}
                </h1>
                {product.description && (
                  <p className="mt-2 text-center text-sm text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                )}
                <p className="mt-2 text-center text-xs text-violet-700 dark:text-violet-300">
                  {trackCount === 1
                    ? '1 áudio nesta pasta'
                    : `${trackCount} áudios nesta pasta`}
                </p>
              </div>

              {!product.unlocked && (
                <div className="border-t border-border/60 px-4 py-3">
                  <Button
                    type="button"
                    className="h-11 w-full gap-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() =>
                      window.open(product.purchaseUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    <Lock className="h-4 w-4" />
                    {t('catalog.action.unlock', 'Desbloquear acesso')}
                  </Button>
                </div>
              )}
            </article>

            {trackCount === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t(
                  'audioterapia.noTracks',
                  'Nenhum áudio cadastrado nesta audioterapia ainda.'
                )}
              </p>
            ) : (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                {groups.map((group) => (
                  <div key={group.locale} className="space-y-2">
                    {groups.length > 1 && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                        {group.label}
                      </p>
                    )}
                    <ul className="space-y-2">
                      {group.tracks.map((track) => (
                        <li key={track.id}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-11 w-full justify-start gap-2 rounded-xl border-violet-200 text-left text-sm font-medium text-violet-900 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-100"
                            disabled={openingTrack === track.sortOrder}
                            onClick={() => openTrack(track.sortOrder)}
                          >
                            {openingTrack === track.sortOrder ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            ) : product.unlocked ? (
                              <Headphones className="h-4 w-4 shrink-0" />
                            ) : (
                              <Lock className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate">{track.title}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

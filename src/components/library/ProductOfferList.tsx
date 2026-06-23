'use client'

import { ProductOfferCard } from './ProductOfferCard'
import type { CatalogProductOffer } from '@/lib/catalog/types'
import { cn } from '@/lib/utils'

type ProductOfferListProps = {
  pageTitle: string
  pageSubtitle: string
  products: CatalogProductOffer[]
  openingId: string | null
  loadingLabel: string
  variant?: 'default' | 'audioterapia'
  onUnlock: (product: CatalogProductOffer) => void
  onAccess: (product: CatalogProductOffer) => void
  isProductOpening?: (productId: string) => boolean
  renderExtras?: (product: CatalogProductOffer) => React.ReactNode
  className?: string
}

export function ProductOfferList({
  pageTitle,
  pageSubtitle,
  products,
  openingId,
  loadingLabel,
  variant = 'default',
  onUnlock,
  onAccess,
  isProductOpening,
  renderExtras,
  className
}: ProductOfferListProps) {
  return (
    <div className={cn('mx-auto w-full max-w-lg min-w-0 space-y-4 sm:space-y-5', className)}>
      <header className="space-y-1 pb-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{pageSubtitle}</p>
      </header>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum produto disponível no momento.
        </p>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductOfferCard
              key={product.id}
              title={product.title}
              description={product.description ?? ''}
              tag={product.tagLabel ?? ''}
              imageSrc={product.imageSrc}
              imageAlt={product.title}
              unlocked={product.unlocked}
              isLoading={isProductOpening?.(product.id) ?? openingId === product.id}
              unlockedLabel={product.resolvedUnlockedLabel}
              lockedLabel={product.lockedLabel}
              loadingLabel={loadingLabel}
              variant={variant}
              onUnlock={() => onUnlock(product)}
              onAccess={() => onAccess(product)}
            >
              {renderExtras?.(product)}
            </ProductOfferCard>
          ))}
        </div>
      )}
    </div>
  )
}

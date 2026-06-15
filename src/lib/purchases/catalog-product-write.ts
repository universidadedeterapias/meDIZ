import type { CatalogSection, PaymentProvider } from '@prisma/client'
import type { CatalogProductBody } from '@/lib/catalog/schemas'
import { mediaItemsToJson } from '@/lib/catalog/media-items'

export function catalogProductWriteData(data: CatalogProductBody) {
  const paymentProvider: PaymentProvider =
    data.freeAccess ? 'FREE' : data.paymentProvider

  return {
    section: data.section as CatalogSection,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    tagLabel: data.tagLabel?.trim() || null,
    coverImageUrl: data.coverImageUrl?.trim() || null,
    purchaseUrl: data.purchaseUrl.trim(),
    permissionKey: data.permissionKey,
    locale: data.locale ?? null,
    pdfIndex: data.pdfIndex,
    mediaFileName: data.mediaFileName?.trim() || null,
    mediaItems: mediaItemsToJson(data.mediaItems ?? null),
    hotmartProductId: data.hotmartProductId?.trim() || null,
    stoneProductId: data.stoneProductId?.trim() || null,
    paymentProvider,
    unlockedLabel: data.unlockedLabel?.trim() || null,
    freeAccess: data.freeAccess,
    sortOrder: data.sortOrder,
    active: data.active
  }
}

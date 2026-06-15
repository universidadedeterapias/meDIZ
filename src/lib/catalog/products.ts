import type { CatalogSection, PaymentProvider } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BIBLIOTECA_CATALOG } from '@/lib/library/productCatalog'
import {
  type CatalogProductDto,
  type CatalogProductOffer,
  defaultUnlockedLabel,
  permissionKeyToLib
} from './types'
import { parseMediaItems } from '@/lib/catalog/media-items'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import type { LibraryPermissoes } from '@/lib/library/permissions'

const PLACEHOLDER_COVER = '/catalog/placeholder.svg'

import { loadGrantsProductIds } from '@/lib/purchases/catalog-grants'
import { loadExtraHotmartProductIds } from '@/lib/purchases/catalog-external-ids'

export type CatalogProductRowInput = {
  id: string
  section: CatalogSection
  title: string
  description: string | null
  tagLabel: string | null
  coverImageUrl: string | null
  purchaseUrl: string
  permissionKey: CatalogProductDto['permissionKey']
  locale: string | null
  pdfIndex: number
  mediaFileName: string | null
  mediaItems: unknown
  stoneProductId?: string | null
  hotmartProductId?: string | null
  extraHotmartProductIds?: string[]
  paymentProvider?: PaymentProvider
  grantsProductIds?: string[]
  unlockedLabel: string | null
  freeAccess: boolean
  sortOrder: number
  active: boolean
}

export function serializeProduct(row: CatalogProductRowInput): CatalogProductDto {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    description: row.description,
    tagLabel: row.tagLabel,
    coverImageUrl: row.coverImageUrl,
    purchaseUrl: row.purchaseUrl,
    permissionKey: row.permissionKey,
    locale: row.locale,
    pdfIndex: row.pdfIndex,
    mediaFileName: row.mediaFileName,
    mediaItems: parseMediaItems(row.mediaItems),
    stoneProductId: row.stoneProductId ?? null,
    hotmartProductId: row.hotmartProductId ?? null,
    extraHotmartProductIds: row.extraHotmartProductIds ?? [],
    paymentProvider: row.paymentProvider ?? 'HOTMART',
    grantsProductIds: row.grantsProductIds ?? [],
    unlockedLabel: row.unlockedLabel,
    freeAccess: row.freeAccess,
    sortOrder: row.sortOrder,
    active: row.active
  }
}

export async function seedCatalogProductsIfEmpty(): Promise<void> {
  const count = await prisma.catalogProduct.count()
  if (count > 0) return

  const defaultHotmart =
    process.env.NEXT_PUBLIC_HOTMART_SALES_URL || 'https://pay.hotmart.com/'

  const bibliotecaRows = BIBLIOTECA_CATALOG.map((entry, index) => ({
    section: 'BIBLIOTECA' as const,
    title: entry.titleFallback,
    description: entry.descriptionFallback,
    tagLabel: entry.tagFallback,
    coverImageUrl: entry.imageSrc.startsWith('/catalog/')
      ? entry.imageSrc
      : null,
    purchaseUrl: entry.purchaseUrl || defaultHotmart,
    permissionKey:
      entry.permissionKey === 'livro_digital'
        ? ('LIVRO_DIGITAL' as const)
        : ('PDF' as const),
    locale: 'pt' as const,
    pdfIndex: entry.pdfIndex ?? 0,
    unlockedLabel: entry.unlockedLabelFallback,
    sortOrder: index,
    active: true
  }))

  await prisma.catalogProduct.createMany({
    data: bibliotecaRows
  })
}

export async function listCatalogProducts(options: {
  section: CatalogSection
  activeOnly?: boolean
}): Promise<CatalogProductDto[]> {
  await seedCatalogProductsIfEmpty()

  const rows = await prisma.catalogProduct.findMany({
    where: {
      section: options.section,
      ...(options.activeOnly ? { active: true } : {})
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  })

  const serialized = await Promise.all(
    rows.map(async (row) => {
      const [grantsProductIds, extraHotmartProductIds] = await Promise.all([
        loadGrantsProductIds(row.id),
        loadExtraHotmartProductIds(row.id)
      ])
      return serializeProduct({ ...row, grantsProductIds, extraHotmartProductIds })
    })
  )

  return serialized
}

function isUnlocked(
  product: CatalogProductDto,
  permissoes: Pick<
    LibraryPermissoes,
    'livro_digital' | 'pdf' | 'audioterapia'
  >,
  productEntitlements?: Set<string>
): boolean {
  if (isFreeCatalogProduct(product)) return true
  if (productEntitlements?.has(product.id)) return true
  if (product.paymentProvider === 'STONE' || product.permissionKey === 'VIDEO') {
    return false
  }
  const key = permissionKeyToLib(product.permissionKey)
  return permissoes[key]
}

export function mapProductsToOffers(
  products: CatalogProductDto[],
  permissoes: Pick<
    LibraryPermissoes,
    'livro_digital' | 'pdf' | 'audioterapia'
  >,
  lockedLabel: string,
  pdfTitlesByIndex?: Record<number, string>,
  productEntitlements?: Set<string>
): CatalogProductOffer[] {
  return products.map((product) => {
    const title =
      product.permissionKey === 'PDF' &&
      pdfTitlesByIndex?.[product.pdfIndex]
        ? pdfTitlesByIndex[product.pdfIndex]
        : product.title

    return {
      ...product,
      title,
      unlocked: isUnlocked(product, permissoes, productEntitlements),
      lockedLabel,
      resolvedUnlockedLabel:
        product.unlockedLabel?.trim() ||
        defaultUnlockedLabel(product.permissionKey),
      imageSrc: product.coverImageUrl || PLACEHOLDER_COVER
    }
  })
}

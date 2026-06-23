import type { CatalogPermissionKey, CatalogSection } from '@prisma/client'

import type { PaymentProvider } from '@prisma/client'

export type CourseMediaKind = 'video' | 'pdf' | 'audio'

export type CatalogMediaItem = {
  id: string
  title: string
  mediaFileName: string
  locale?: string
  sortOrder: number
  /** video | pdf para cursos; audio implícito em audioterapia legada */
  kind?: CourseMediaKind
}

export type CatalogProductDto = {
  id: string
  section: CatalogSection
  title: string
  description: string | null
  tagLabel: string | null
  coverImageUrl: string | null
  purchaseUrl: string
  permissionKey: CatalogPermissionKey
  locale: string | null
  pdfIndex: number
  mediaFileName: string | null
  mediaItems: CatalogMediaItem[] | null
  stoneProductId: string | null
  hotmartProductId: string | null
  extraHotmartProductIds: string[]
  paymentProvider: PaymentProvider
  grantsProductIds: string[]
  unlockedLabel: string | null
  freeAccess: boolean
  sortOrder: number
  active: boolean
}

export type CatalogProductOffer = CatalogProductDto & {
  unlocked: boolean
  lockedLabel: string
  resolvedUnlockedLabel: string
  imageSrc: string
}

export function permissionKeyToLib(
  key: CatalogPermissionKey
): 'livro_digital' | 'pdf' | 'audioterapia' {
  switch (key) {
    case 'LIVRO_DIGITAL':
      return 'livro_digital'
    case 'PDF':
      return 'pdf'
    case 'VIDEO':
      return 'pdf'
    case 'AUDIOTERAPIA':
      return 'audioterapia'
  }
}

export function resolveUnlockedLabelForProduct(
  product: Pick<CatalogProductDto, 'permissionKey' | 'unlockedLabel'>
): string {
  const custom = product.unlockedLabel?.trim()
  if (product.permissionKey === 'VIDEO') {
    if (!custom || custom === 'Assistir vídeo') return 'Acessar curso'
    return custom
  }
  return custom || defaultUnlockedLabel(product.permissionKey)
}

export function defaultUnlockedLabel(key: CatalogPermissionKey): string {
  switch (key) {
    case 'LIVRO_DIGITAL':
      return 'Acessar livro'
    case 'PDF':
      return 'Acessar PDF'
    case 'VIDEO':
      return 'Acessar curso'
    case 'AUDIOTERAPIA':
      return 'Ouvir agora'
  }
}

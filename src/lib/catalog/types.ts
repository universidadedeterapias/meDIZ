import type { CatalogPermissionKey, CatalogSection } from '@prisma/client'

export type CatalogMediaItem = {
  id: string
  title: string
  mediaFileName: string
  locale?: string
  sortOrder: number
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
  pdfIndex: number
  mediaFileName: string | null
  mediaItems: CatalogMediaItem[] | null
  unlockedLabel: string | null
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
    case 'AUDIOTERAPIA':
      return 'audioterapia'
  }
}

export function defaultUnlockedLabel(key: CatalogPermissionKey): string {
  switch (key) {
    case 'LIVRO_DIGITAL':
      return 'Acessar livro'
    case 'PDF':
      return 'Acessar PDF'
    case 'AUDIOTERAPIA':
      return 'Ouvir agora'
  }
}

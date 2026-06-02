import type { CatalogSection } from '@prisma/client'

/** Audioterapias gratuitas (acesso sem compra na Hotmart). */
const FREE_AUDIOTERAPIA_TITLE_KEYS = ['dor existencial']

export function normalizeCatalogTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function isFreeCatalogProduct(product: {
  title: string
  section?: CatalogSection | null
}): boolean {
  if (product.section && product.section !== 'AUDIOTERAPIA') {
    return false
  }

  const key = normalizeCatalogTitle(product.title)
  return FREE_AUDIOTERAPIA_TITLE_KEYS.some(
    (freeTitle) => key === freeTitle || key.includes(freeTitle)
  )
}

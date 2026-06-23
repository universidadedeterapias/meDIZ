import type { CatalogProductDto } from '@/lib/catalog/types'

export type CatalogListSection = 'BIBLIOTECA' | 'AUDIOTERAPIA' | 'CURSOS'

export const CATALOG_LIST_SECTIONS: CatalogListSection[] = [
  'BIBLIOTECA',
  'AUDIOTERAPIA',
  'CURSOS'
]

export function isCatalogListSection(value: string): value is CatalogListSection {
  return CATALOG_LIST_SECTIONS.includes(value as CatalogListSection)
}

export function filterProductsByListSection(
  products: CatalogProductDto[],
  section: CatalogListSection
): CatalogProductDto[] {
  if (section === 'CURSOS') {
    return products.filter((product) => product.permissionKey === 'VIDEO')
  }

  if (section === 'BIBLIOTECA') {
    return products.filter(
      (product) =>
        product.section === 'BIBLIOTECA' && product.permissionKey !== 'VIDEO'
    )
  }

  return products.filter((product) => product.section === section)
}

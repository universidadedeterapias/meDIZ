import type { LanguageCode } from '@/i18n/config'
import type { CatalogMediaItem } from '@/lib/catalog/types'

export const CATALOG_CONTENT_LOCALES = ['pt', 'en', 'es'] as const
export type CatalogContentLocale = (typeof CATALOG_CONTENT_LOCALES)[number]

export function languageToCatalogLocale(lang: LanguageCode): CatalogContentLocale {
  if (lang === 'en') return 'en'
  if (lang === 'es') return 'es'
  return 'pt'
}

export function normalizeCatalogLocale(
  value?: string | null
): CatalogContentLocale | null {
  if (!value?.trim()) return null
  const v = value.trim().toLowerCase()
  if (v === 'pt' || v === 'pt-br' || v === 'pt-pt') return 'pt'
  if (v === 'en') return 'en'
  if (v === 'es') return 'es'
  return null
}

export function catalogLocaleLabel(
  locale: CatalogContentLocale | null | undefined
): string {
  switch (locale) {
    case 'pt':
      return 'Português'
    case 'en':
      return 'English'
    case 'es':
      return 'Español'
    default:
      return 'Todos os idiomas'
  }
}

/** Produto sem locale definido aparece para todos. */
export function productMatchesUserLanguage(
  productLocale: string | null | undefined,
  userLanguage: LanguageCode
): boolean {
  const normalized = normalizeCatalogLocale(productLocale)
  if (!normalized) return true
  return normalized === languageToCatalogLocale(userLanguage)
}

export function mediaItemMatchesUserLanguage(
  itemLocale: string | undefined,
  userLanguage: LanguageCode
): boolean {
  if (!itemLocale?.trim()) return true
  const normalized = normalizeCatalogLocale(itemLocale)
  if (normalized) {
    return normalized === languageToCatalogLocale(userLanguage)
  }
  if (itemLocale === 'pt-BR' || itemLocale === 'pt-PT') {
    return languageToCatalogLocale(userLanguage) === 'pt'
  }
  return itemLocale === userLanguage
}

export function filterMediaItemsForUserLanguage(
  items: CatalogMediaItem[],
  userLanguage: LanguageCode
): CatalogMediaItem[] {
  return items.filter((item) =>
    mediaItemMatchesUserLanguage(item.locale, userLanguage)
  )
}

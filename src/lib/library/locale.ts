import {
  DEFAULT_LANGUAGE,
  type LanguageCode,
  isSupportedLanguage
} from '@/i18n/config'

/** Ordem de fallback quando um arquivo do idioma não existir no disco. */
export const LIBRARY_LOCALE_FALLBACK: Record<LanguageCode, LanguageCode[]> = {
  'pt-BR': ['pt-BR', 'en', 'es', 'pt-PT'],
  'pt-PT': ['pt-PT', 'pt-BR', 'en', 'es'],
  en: ['en', 'pt-BR', 'es', 'pt-PT'],
  es: ['es', 'pt-BR', 'en', 'pt-PT']
}

export function resolveLibraryLocale(input: string | null | undefined): LanguageCode {
  if (isSupportedLanguage(input)) return input
  return DEFAULT_LANGUAGE
}

export function libraryLocaleCandidates(locale: LanguageCode): LanguageCode[] {
  return LIBRARY_LOCALE_FALLBACK[locale] ?? LIBRARY_LOCALE_FALLBACK[DEFAULT_LANGUAGE]
}

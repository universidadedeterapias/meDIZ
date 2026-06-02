import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  isSupportedLanguage
} from './config'
import { getMessages } from './LanguageProvider'

async function detectBrowserLanguage(): Promise<LanguageCode> {
  const headerStore = await headers()
  const acceptLanguage = headerStore.get('accept-language')
  if (!acceptLanguage) return DEFAULT_LANGUAGE

  const languages = acceptLanguage.split(',').map(item => item.split(';')[0]?.trim())
  const matched = languages.find(lang => isSupportedLanguage(lang))
  return matched ?? DEFAULT_LANGUAGE
}

export async function getCurrentLanguage(): Promise<LanguageCode> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LANGUAGE_COOKIE)?.value
  if (isSupportedLanguage(fromCookie)) {
    return fromCookie
  }
  return await detectBrowserLanguage()
}

export async function getServerTranslations(language?: LanguageCode) {
  const lang = language ?? await getCurrentLanguage()
  const messages = getMessages(lang)

  function t(key: string, fallback?: string) {
    return messages[key] ?? fallback ?? key
  }

  return {
    language: lang,
    messages,
    t
  }
}

export function getLanguageOptions() {
  return SUPPORTED_LANGUAGES
}


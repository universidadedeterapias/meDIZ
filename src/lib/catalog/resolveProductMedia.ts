import type { CatalogPermissionKey } from '@prisma/client'
import type { LanguageCode } from '@/i18n/config'
import {
  resolveAudioterapiaFile,
  toPublicUrl,
  fileExists,
  type LibraryContentKey
} from '@/lib/library/contentPaths'
import { isRemoteMediaRef } from '@/lib/catalog/media-upload'
import { permissionKeyToLib } from '@/lib/catalog/types'
import {
  livroDigitalUrlFromEnv,
  pdfUrlsFromEnv
} from '@/lib/library/libraryEnvUrls'

export function permissionToContentKey(
  key: CatalogPermissionKey
): LibraryContentKey {
  const lib = permissionKeyToLib(key)
  return lib
}

export function resolveProductMediaUrl(
  permissionKey: CatalogPermissionKey,
  mediaFileName: string | null | undefined,
  locale: LanguageCode,
  baseUrl?: string
): { url: string; locale: LanguageCode } | null {
  const ref = mediaFileName?.trim()

  if (!ref) {
    if (permissionKey === 'LIVRO_DIGITAL') {
      const envUrl = livroDigitalUrlFromEnv(locale)
      return envUrl ? { url: envUrl, locale } : null
    }
    if (permissionKey === 'PDF') {
      const envUrls = pdfUrlsFromEnv(locale)
      if (envUrls[0]) {
        return { url: envUrls[0].url, locale }
      }
    }
    return null
  }

  if (isRemoteMediaRef(ref)) {
    return { url: ref.trim(), locale }
  }

  const normalized = ref.replace(/\\/g, '/')

  if (fileExists(normalized)) {
    return { url: toPublicUrl(normalized, baseUrl), locale }
  }

  if (permissionKey === 'AUDIOTERAPIA') {
    const file = resolveAudioterapiaFile(locale, normalized)
    if (file) {
      return { url: toPublicUrl(file.relative, baseUrl), locale: file.locale }
    }
  }

  if (
    permissionKey === 'PDF' ||
    permissionKey === 'LIVRO_DIGITAL' ||
    permissionKey === 'VIDEO'
  ) {
    const candidates = [
      normalized,
      `pdf/${normalized}`,
      `pdf/uploads/${normalized}`,
      `livro-digital/${normalized}`,
      `livro digital/${normalized}`
    ]
    for (const candidate of candidates) {
      if (fileExists(candidate)) {
        return { url: toPublicUrl(candidate, baseUrl), locale }
      }
    }
  }

  return null
}

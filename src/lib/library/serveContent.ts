import { NextResponse } from 'next/server'
import type { LanguageCode } from '@/i18n/config'
import {
  resolveAudioterapiaFile,
  resolveLivroDigitalFile,
  resolvePdfVariants,
  toPublicUrl,
  type LibraryContentKey
} from './contentPaths'
import {
  assertLibraryContentAccess,
  LibraryAccessError,
  type LibraryAuthIdentity
} from './permissions'
import { resolveLibraryLocale } from './locale'
import { isRemoteMediaRef } from '@/lib/catalog/media-upload'
import { livroDigitalUrlFromEnv, pdfUrlsFromEnv } from './libraryEnvUrls'
import {
  protectMediaPayload,
  protectMediaUrlList
} from '@/lib/library/protect-media-url'

export type LibraryContentResponse =
  | { url: string; locale: LanguageCode }
  | {
      urls: Array<{ url: string; label: string }>
      locale: LanguageCode
    }

export async function serveLibraryContent(
  user: LibraryAuthIdentity,
  content: LibraryContentKey,
  language: string | null | undefined,
  options?: {
    mediaFileName?: string | null
    skipPermissionCheck?: boolean
    productId?: string
    freeAccess?: boolean
  }
): Promise<NextResponse> {
  if (!options?.skipPermissionCheck) {
    try {
      await assertLibraryContentAccess(user, content)
    } catch (e) {
      if (e instanceof LibraryAccessError) {
        return NextResponse.json(
          { error: 'NO_PERMISSION_FOR_THIS_CONTENT' },
          { status: 403 }
        )
      }
      throw e
    }
  }

  const locale = resolveLibraryLocale(language)
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? process.env.PUBLIC_APP_URL || process.env.NEXTAUTH_URL || undefined
      : undefined

  let payload: LibraryContentResponse | null = null

  if (content === 'audioterapia') {
    const ref = options?.mediaFileName
    if (ref && isRemoteMediaRef(ref)) {
      payload = { url: ref.trim(), locale }
    } else {
      const file = resolveAudioterapiaFile(locale, ref)
      if (file) {
        payload = {
          url: toPublicUrl(file.relative, baseUrl),
          locale: file.locale
        }
      }
    }
  } else if (content === 'livro_digital') {
    const envUrl = livroDigitalUrlFromEnv(locale)
    if (envUrl) {
      payload = { url: envUrl, locale }
    } else {
      const file = resolveLivroDigitalFile(locale)
      if (file) {
        payload = {
          url: toPublicUrl(file.relative, baseUrl),
          locale: file.locale
        }
      }
    }
  } else if (content === 'pdf') {
    const envUrls = pdfUrlsFromEnv(locale)
    if (envUrls.length > 0) {
      payload = {
        locale,
        urls: envUrls
      }
    } else {
      const variants = resolvePdfVariants(locale)
      if (variants.length > 0) {
        payload = {
          locale: variants[0].locale,
          urls: variants.map((v) => ({
            url: toPublicUrl(v.relative, baseUrl),
            label: v.label
          }))
        }
      }
    }
  }

  if (!payload) {
    return NextResponse.json(
      { error: 'CONTENT_NOT_AVAILABLE', locale },
      { status: 404 }
    )
  }

  const protectOptions = {
    productId: options?.productId,
    permission: content,
    freeAccess: options?.freeAccess
  }

  const protectedPayload =
    'urls' in payload
      ? {
          ...payload,
          urls: protectMediaUrlList(payload.urls, user.id, protectOptions)
        }
      : protectMediaPayload(payload, user.id, protectOptions)

  return NextResponse.json(protectedPayload, {
    headers: { 'Cache-Control': 'no-store' }
  })
}

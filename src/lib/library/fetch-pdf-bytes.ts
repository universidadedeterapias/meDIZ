import { promises as fs } from 'fs'
import type { CatalogPermissionKey } from '@prisma/client'
import type { LanguageCode } from '@/i18n/config'
import { resolveProductMediaUrl } from '@/lib/catalog/resolveProductMedia'
import { isRemoteMediaRef } from '@/lib/catalog/media-upload'
import { getAbsolutePath } from '@/lib/library/contentPaths'
import { normalizeMediaStreamSource } from '@/lib/library/normalize-stream-source'
import { buildOriginFetchHeaders, isAllowedMediaOrigin } from '@/lib/library/media-origin'
import { extractR2KeyFromUrl, getBufferFromR2, isR2Configured } from '@/lib/r2'

export async function fetchOriginalPdfBytes(
  permissionKey: CatalogPermissionKey,
  mediaFileName: string | null | undefined,
  locale: LanguageCode
): Promise<Buffer> {
  const resolved = resolveProductMediaUrl(
    permissionKey,
    mediaFileName,
    locale
  )
  if (!resolved?.url) {
    throw new Error('PDF_ORIGINAL_NOT_FOUND')
  }

  const source = normalizeMediaStreamSource(resolved.url)

  if (!isRemoteMediaRef(source)) {
    const absolute = getAbsolutePath(source)
    return fs.readFile(absolute)
  }

  if (isR2Configured()) {
    const key = extractR2KeyFromUrl(source)
    if (key) {
      return getBufferFromR2(key)
    }
  }

  if (!isAllowedMediaOrigin(source)) {
    throw new Error('PDF_ORIGIN_NOT_ALLOWED')
  }

  const response = await fetch(source, {
    headers: buildOriginFetchHeaders(),
    cache: 'no-store'
  })
  if (!response.ok) {
    throw new Error('PDF_FETCH_FAILED')
  }
  return Buffer.from(await response.arrayBuffer())
}

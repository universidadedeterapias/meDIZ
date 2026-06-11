import {
  createMediaAccessToken,
  type LibraryMediaPermission
} from '@/lib/library/media-access-token'
import { inferLibraryMediaKind } from '@/lib/library/media-origin'
import { normalizeMediaStreamSource } from '@/lib/library/normalize-stream-source'

export type ProtectMediaUrlOptions = {
  productId?: string
  permission?: LibraryMediaPermission
  freeAccess?: boolean
}

export function isProtectedMediaPath(url: string): boolean {
  return url.includes('/api/library/stream')
}

export function protectMediaUrl(
  originUrl: string,
  userId: string,
  options?: ProtectMediaUrlOptions
): string {
  const src = originUrl?.trim()
  if (!src) return originUrl
  if (isProtectedMediaPath(src)) return src

  const token = createMediaAccessToken({
    uid: userId,
    src: normalizeMediaStreamSource(src),
    pid: options?.productId,
    perm: options?.permission,
    free: options?.freeAccess === true,
    kind: inferLibraryMediaKind(src, options?.permission)
  })

  return `/api/library/stream?token=${encodeURIComponent(token)}`
}

export function protectMediaPayload<T extends { url: string }>(
  payload: T,
  userId: string,
  options?: ProtectMediaUrlOptions
): T {
  return {
    ...payload,
    url: protectMediaUrl(payload.url, userId, options)
  }
}

export function protectMediaUrlList(
  urls: Array<{ url: string; label: string }>,
  userId: string,
  options?: ProtectMediaUrlOptions
): Array<{ url: string; label: string }> {
  return urls.map((item) => protectMediaPayload(item, userId, options))
}

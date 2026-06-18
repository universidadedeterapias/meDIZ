export const R2_MAX_BYTES = 200 * 1024 * 1024

/** Upload via API (sem CORS no browser) — capas, PDFs pequenos, etc. */
export const R2_PROXY_MAX_BYTES = 25 * 1024 * 1024

export const R2_ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'video/mp4',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
] as const

export type R2AllowedContentType = (typeof R2_ALLOWED_CONTENT_TYPES)[number]

export function guessContentTypeFromFileName(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'mp3':
      return 'audio/mpeg'
    case 'mp4':
      return 'video/mp4'
    case 'wav':
      return 'audio/wav'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

export function isAllowedR2ContentType(contentType: string): boolean {
  return (R2_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)
}

export function resolveR2ContentType(
  fileName: string,
  contentType: string
): string {
  const trimmed = contentType.trim()
  if (trimmed && trimmed !== 'application/octet-stream') {
    return trimmed
  }
  return guessContentTypeFromFileName(fileName)
}

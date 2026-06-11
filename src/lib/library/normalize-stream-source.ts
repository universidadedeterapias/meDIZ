/**
 * Converte URLs públicas `/biblioteca/...` (ou absolutas equivalentes)
 * no caminho relativo dentro de `public/biblioteca/`.
 */
export function normalizeMediaStreamSource(originUrl: string): string {
  const src = originUrl?.trim()
  if (!src) return src

  try {
    if (/^https?:\/\//i.test(src)) {
      const url = new URL(src)
      const decodedPath = decodeURIComponent(url.pathname)
      if (decodedPath.startsWith('/biblioteca/')) {
        return decodedPath.slice('/biblioteca/'.length)
      }
      return src
    }
  } catch {
    // continua com normalização de caminho relativo
  }

  const pathOnly = src.replace(/\\/g, '/')
  let decoded = pathOnly
  try {
    decoded = decodeURIComponent(pathOnly)
  } catch {
    decoded = pathOnly
  }

  if (decoded.startsWith('/biblioteca/')) {
    return decoded.slice('/biblioteca/'.length)
  }
  if (decoded.startsWith('biblioteca/')) {
    return decoded.slice('biblioteca/'.length)
  }

  return decoded.replace(/^\/+/, '')
}

export function isRemoteStreamSource(source: string): boolean {
  return /^https?:\/\//i.test(source.trim())
}

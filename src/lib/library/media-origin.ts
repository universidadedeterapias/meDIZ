export type LibraryMediaKind = 'audio' | 'pdf' | 'other'

export function inferLibraryMediaKind(
  src: string,
  permission?: 'audioterapia' | 'pdf' | 'livro_digital'
): LibraryMediaKind {
  if (permission === 'audioterapia' || /\.(mp3|mp4)(\?|$)/i.test(src)) {
    return 'audio'
  }
  if (
    permission === 'pdf' ||
    permission === 'livro_digital' ||
    /\.pdf(\?|$)/i.test(src)
  ) {
    return 'pdf'
  }
  return 'other'
}

function collectAllowedMediaHosts(): string[] {
  const hosts = new Set<string>()

  const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim()
  if (r2PublicUrl) {
    try {
      hosts.add(new URL(r2PublicUrl).hostname.toLowerCase())
    } catch {
      // ignore invalid R2_PUBLIC_URL
    }
  }

  const legacyHosts = process.env.N8N_MEDIA_ALLOWED_ORIGIN_HOSTS?.trim()
  if (legacyHosts) {
    for (const host of legacyHosts.split(',')) {
      const normalized = host.trim().toLowerCase()
      if (normalized) hosts.add(normalized)
    }
  }

  // Catálogo legado (Cloudinary) ainda referenciado em produtos existentes
  hosts.add('res.cloudinary.com')

  return [...hosts]
}

export function isAllowedMediaOrigin(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false
    }

    const hosts = collectAllowedMediaHosts()
    if (hosts.length === 0) return true

    return hosts.includes(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

export function buildOriginFetchHeaders(): HeadersInit {
  const headers: Record<string, string> = {}
  const authorization = process.env.N8N_MEDIA_FETCH_AUTHORIZATION?.trim()
  if (authorization) {
    headers.Authorization = authorization.startsWith('Bearer ')
      ? authorization
      : `Bearer ${authorization}`
  }
  const apiKey = process.env.N8N_MEDIA_FETCH_API_KEY?.trim()
  if (apiKey) {
    headers['X-API-Key'] = apiKey
  }
  return headers
}

/** Bloqueia abrir o stream direto no navegador (barra de endereço / nova aba). */
export function isAllowedStreamFetchDest(
  fetchDest: string | null,
  kind: LibraryMediaKind,
  fetchSite: string | null = null
): boolean {
  // Safari no iOS pode promover um PDF embutido para uma navegação de
  // documento. Aceitamos esse caso apenas quando o próprio navegador atesta
  // que a requisição veio da mesma origem; navegação direta continua bloqueada.
  if (fetchDest === 'document') {
    return kind === 'pdf' && fetchSite === 'same-origin'
  }

  if (kind === 'pdf') {
    // iframe: visualizador legado; empty/null: pdf.js no app (mesma origem + token)
    return fetchDest === 'iframe' || fetchDest === 'embed' || fetchDest === 'empty' || !fetchDest
  }
  if (kind === 'audio') {
    return !fetchDest || fetchDest === 'audio' || fetchDest === 'video'
  }
  return !fetchDest || ['audio', 'video', 'iframe'].includes(fetchDest)
}

export function buildAntiDownloadHeaders(
  contentType: string,
  kind: LibraryMediaKind
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Referrer-Policy': 'same-origin'
  }

  if (kind === 'pdf') {
    headers['Content-Security-Policy'] = "frame-ancestors 'self'"
  }

  return headers
}

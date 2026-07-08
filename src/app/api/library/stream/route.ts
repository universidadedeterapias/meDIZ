import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getAbsolutePath } from '@/lib/library/contentPaths'
import { verifyMediaAccessToken } from '@/lib/library/media-access-token'
import { assertStreamAccess, LibraryStreamAccessError } from '@/lib/library/assert-stream-access'
import {
  isRemoteStreamSource,
  normalizeMediaStreamSource
} from '@/lib/library/normalize-stream-source'
import {
  buildAntiDownloadHeaders,
  buildOriginFetchHeaders,
  inferLibraryMediaKind,
  isAllowedMediaOrigin,
  isAllowedStreamFetchDest,
  type LibraryMediaKind
} from '@/lib/library/media-origin'
import { streamFileResponse } from '@/lib/library/range-stream'
import { requireUser } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function contentTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case '.pdf':
      return 'application/pdf'
    case '.mp3':
      return 'audio/mpeg'
    case '.mp4':
      return 'video/mp4'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function resolveMediaKind(
  src: string,
  payloadKind?: LibraryMediaKind,
  permission?: string
): LibraryMediaKind {
  if (payloadKind) return payloadKind
  return inferLibraryMediaKind(
    src,
    permission as 'audioterapia' | 'pdf' | 'livro_digital' | undefined
  )
}

async function streamLocalFile(
  relativePath: string,
  rangeHeader: string | null,
  kind: LibraryMediaKind
): Promise<NextResponse> {
  const absolute = getAbsolutePath(relativePath.replace(/\\/g, '/'))
  const contentType = contentTypeFromPath(absolute)
  return streamFileResponse(absolute, rangeHeader, buildAntiDownloadHeaders(contentType, kind))
}

async function streamRemoteFile(
  originUrl: string,
  rangeHeader: string | null,
  kind: LibraryMediaKind
): Promise<NextResponse> {
  if (!isAllowedMediaOrigin(originUrl)) {
    throw new LibraryStreamAccessError('Origem de mídia não autorizada', 403)
  }

  const upstreamHeaders: HeadersInit = {
    ...buildOriginFetchHeaders(),
    ...(rangeHeader ? { Range: rangeHeader } : {})
  }

  const upstream = await fetch(originUrl, {
    headers: upstreamHeaders,
    cache: 'no-store'
  })

  if (!upstream.ok && upstream.status !== 206) {
    throw new LibraryStreamAccessError('Arquivo indisponível na origem', 502)
  }

  const contentType =
    upstream.headers.get('Content-Type') ?? 'application/octet-stream'
  const headers = new Headers(buildAntiDownloadHeaders(contentType, kind))

  const forward = ['Content-Length', 'Content-Range', 'Accept-Ranges']
  for (const key of forward) {
    const value = upstream.headers.get(key)
    if (value) headers.set(key, value)
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers
  })
}

export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/stream' })
  if (auth.ok === false) return auth.response

  const token = request.nextUrl.searchParams.get('token')
  const payload = verifyMediaAccessToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'TOKEN_INVALID_OR_EXPIRED' }, { status: 401 })
  }

  const mediaKind = resolveMediaKind(payload.src, payload.kind, payload.perm)
  const fetchDest = request.headers.get('sec-fetch-dest')

  if (!isAllowedStreamFetchDest(fetchDest, mediaKind)) {
    return NextResponse.json(
      {
        error:
          mediaKind === 'pdf'
            ? 'USE_LIBRARY_VIEWER'
            : 'DIRECT_STREAM_NOT_ALLOWED'
      },
      { status: 403 }
    )
  }

  try {
    await assertStreamAccess(auth.user, payload)
  } catch (e) {
    if (e instanceof LibraryStreamAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const rangeHeader = request.headers.get('range')

  try {
    const source = normalizeMediaStreamSource(payload.src)

    if (isRemoteStreamSource(source)) {
      return await streamRemoteFile(source, rangeHeader, mediaKind)
    }

    if (source.includes('..')) {
      return NextResponse.json({ error: 'INVALID_SOURCE' }, { status: 400 })
    }

    return await streamLocalFile(source, rangeHeader, mediaKind)
  } catch (e) {
    if (e instanceof LibraryStreamAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/stream]', e)
    return NextResponse.json({ error: 'STREAM_FAILED' }, { status: 500 })
  }
}

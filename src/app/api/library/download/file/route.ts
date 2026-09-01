import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import { verifyPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'
import {
  cacheKeyFor,
  getCachedPath,
  pruneExpiredCacheEntries
} from '@/lib/library/pdf-download-cache'
import { PdfSourceTooLargeError } from '@/lib/library/pdf-download-concurrency'
import { garantePreparo } from '@/lib/library/prepare-pdf-download'
import { streamFileResponse } from '@/lib/library/range-stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 1-em-20 requests dispara a limpeza do cache expirado; evita rodar em toda chamada.
const PRUNE_SAMPLE_RATE = 20

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

function safeFilename(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'documento'
  )
}

/**
 * Entrega a cópia licenciada.
 *
 * No caminho normal o arquivo já foi preparado pelo `/request` e esta rota só
 * transmite — com Range, então o navegador retoma sozinho se a rede cair no meio,
 * que é o caso comum em 4G.
 *
 * O `garantePreparo` cobre a exceção: o cache pode ter sumido entre o preparo e o
 * clique (limpeza por TTL, reinício do container). Sem ele a pessoa receberia
 * erro num arquivo que o app acabou de mostrar como pronto.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/file' })
  if (auth.ok === false) return auth.response

  const token = request.nextUrl.searchParams.get('token')
  const payload = verifyPdfDownloadToken(token)
  if (!payload || payload.uid !== auth.user.id) {
    return NextResponse.json(
      { error: 'TOKEN_INVALID_OR_EXPIRED' },
      { status: 401 }
    )
  }

  if (Math.random() < 1 / PRUNE_SAMPLE_RATE) {
    void pruneExpiredCacheEntries().catch(() => {})
  }

  try {
    const { product, downloadTitle, mediaId, locale } =
      await getPdfProductForDownload(payload.pid, auth.user, {
        mediaId: payload.mid
      })

    const cacheKey = cacheKeyFor(auth.user.id, product.id, mediaId)

    await garantePreparo({
      userId: auth.user.id,
      cacheKey,
      productId: product.id,
      permissionKey: product.permissionKey,
      mediaFileName: product.mediaFileName,
      downloadTitle,
      locale,
      clientIp: clientIp(request),
      userAgent: request.headers.get('user-agent')
    })

    const filename = `${safeFilename(downloadTitle)}-licenciado.pdf`

    return await streamFileResponse(getCachedPath(cacheKey), request.headers.get('range'), {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff'
    })
  } catch (e) {
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    if (e instanceof PdfSourceTooLargeError) {
      return NextResponse.json({ error: 'PDF_SOURCE_TOO_LARGE' }, { status: 413 })
    }
    console.error('[library/download/file]', e)
    return NextResponse.json({ error: 'DOWNLOAD_GENERATION_FAILED' }, { status: 500 })
  }
}

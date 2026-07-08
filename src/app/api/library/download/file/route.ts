import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { fetchOriginalPdfBytes } from '@/lib/library/fetch-pdf-bytes'
import { logPdfDownload } from '@/lib/library/pdf-download-limits'
import { verifyPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  applyPdfWatermark,
  formatCpfForDisplay,
  resolveDisplayName
} from '@/lib/library/watermark-pdf'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'
import {
  cacheKeyFor,
  getCachedPath,
  isCacheFresh,
  pruneExpiredCacheEntries,
  writeCacheAtomically
} from '@/lib/library/pdf-download-cache'
import {
  assertPdfSourceSize,
  PdfSourceTooLargeError,
  withPdfGenerationSlot
} from '@/lib/library/pdf-download-concurrency'
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
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80) || 'documento'
  )
}

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

  const rangeHeader = request.headers.get('range')

  try {
    const { product, locale } = await getPdfProductForDownload(payload.pid, auth.user)
    const filename = `${safeFilename(product.title)}-licenciado.pdf`
    const responseHeaders = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff'
    }

    const cacheKey = cacheKeyFor(auth.user.id, product.id)

    // Já processado neste mês: serve do cache local (com suporte a Range/206),
    // sem reprocessar com pdf-lib e sem contar cota de novo.
    if (await isCacheFresh(cacheKey)) {
      return await streamFileResponse(getCachedPath(cacheKey), rangeHeader, responseHeaders)
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { fullName: true, name: true, email: true, cpf: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const watermarked = await withPdfGenerationSlot(async () => {
      const originalBytes = await fetchOriginalPdfBytes(
        product.permissionKey,
        product.mediaFileName,
        locale
      )
      assertPdfSourceSize(originalBytes.length)

      const startedAt = Date.now()
      const rssBefore = process.memoryUsage().rss
      const result = await applyPdfWatermark(
        originalBytes,
        {
          fullName: resolveDisplayName(dbUser.fullName, dbUser.name, dbUser.email),
          email: dbUser.email,
          cpf: formatCpfForDisplay(dbUser.cpf)
        },
        product.title
      )
      console.log('[library/download/file] watermark', {
        productId: product.id,
        sourceBytes: originalBytes.length,
        durationMs: Date.now() - startedAt,
        rssBeforeMb: Math.round(rssBefore / 1024 / 1024),
        rssAfterMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      })
      return result
    })

    await writeCacheAtomically(cacheKey, watermarked)

    await logPdfDownload({
      userId: auth.user.id,
      productId: product.id,
      fileLabel: product.title,
      clientIp: clientIp(request),
      userAgent: request.headers.get('user-agent')
    })

    return await streamFileResponse(getCachedPath(cacheKey), rangeHeader, responseHeaders)
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

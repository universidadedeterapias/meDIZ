import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { fetchOriginalPdfBytes } from '@/lib/library/fetch-pdf-bytes'
import { logPdfDownload } from '@/lib/library/pdf-download-limits'
import {
  consumePdfDownloadToken,
  verifyPdfDownloadToken
} from '@/lib/library/pdf-download-token'
import {
  applyPdfWatermark,
  formatCpfForDisplay,
  resolveDisplayName
} from '@/lib/library/watermark-pdf'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const consumed = await consumePdfDownloadToken(payload)
  if (!consumed) {
    return NextResponse.json(
      { error: 'TOKEN_ALREADY_USED_OR_EXPIRED' },
      { status: 410 }
    )
  }

  try {
    const { product, locale } = await getPdfProductForDownload(
      payload.pid,
      auth.user
    )

    const dbUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { fullName: true, name: true, email: true, cpf: true }
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const originalBytes = await fetchOriginalPdfBytes(
      product.permissionKey,
      product.mediaFileName,
      locale
    )

    const watermarked = await applyPdfWatermark(
      originalBytes,
      {
        fullName: resolveDisplayName(
          dbUser.fullName,
          dbUser.name,
          dbUser.email
        ),
        email: dbUser.email,
        cpf: formatCpfForDisplay(dbUser.cpf)
      },
      product.title
    )

    await logPdfDownload({
      userId: auth.user.id,
      productId: product.id,
      fileLabel: product.title,
      clientIp: clientIp(request),
      userAgent: request.headers.get('user-agent')
    })

    const filename = `${safeFilename(product.title)}-licenciado.pdf`

    return new NextResponse(Buffer.from(watermarked), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (e) {
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/download/file]', e)
    return NextResponse.json({ error: 'DOWNLOAD_GENERATION_FAILED' }, { status: 500 })
  }
}

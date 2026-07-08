import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/requireAuth'
import { getPdfProductForDownload, PdfDownloadAccessError } from '@/lib/library/validate-pdf-download'
import { assertPdfDownloadQuota, PdfDownloadQuotaError } from '@/lib/library/pdf-download-limits'
import { createPdfDownloadToken } from '@/lib/library/pdf-download-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({ productId: z.string().uuid('productId invalido') })

export async function POST(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/request' })
  if (auth.ok === false) return auth.response

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 })
    }

    const { product } = await getPdfProductForDownload(parsed.data.productId, auth.user)
    if (!product.mediaFileName) throw new PdfDownloadAccessError('PDF_SOURCE_NOT_CONFIGURED', 404)

    const quota = await assertPdfDownloadQuota(auth.user.id)
    const { token, expiresAt } = await createPdfDownloadToken(auth.user.id, product.id)
    const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.nextUrl.origin

    return NextResponse.json({
      downloadUrl: `${origin}/api/library/download/file?token=${encodeURIComponent(token)}`,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000),
      quota
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof PdfDownloadQuotaError) {
      return NextResponse.json(
        { error: 'PDF_DOWNLOAD_QUOTA_EXCEEDED', limit: error.limit, message: `Limite de ${error.limit} downloads por mes atingido.` },
        { status: 429 }
      )
    }
    if (error instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[library/download/request]', error)
    return NextResponse.json(
      { error: 'PDF_PREPARATION_TEMPORARILY_UNAVAILABLE', retryable: true },
      { status: 503, headers: { 'Retry-After': '30' } }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/requireAuth'
import {
  assertPdfDownloadQuota,
  PdfDownloadQuotaError
} from '@/lib/library/pdf-download-limits'
import { createPdfDownloadToken } from '@/lib/library/pdf-download-token'
import {
  getPdfProductForDownload,
  PdfDownloadAccessError
} from '@/lib/library/validate-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  productId: z.string().uuid('productId inválido')
})

export async function POST(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/request' })
  if (auth.ok === false) return auth.response

  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_BODY', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    await getPdfProductForDownload(parsed.data.productId, auth.user)

    const quota = await assertPdfDownloadQuota(auth.user.id)
    const { token, expiresAt } = await createPdfDownloadToken(
      auth.user.id,
      parsed.data.productId
    )

    const origin =
      process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
      request.nextUrl.origin

    return NextResponse.json(
      {
        downloadUrl: `${origin}/api/library/download/file?token=${encodeURIComponent(token)}`,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000),
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining
        }
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    if (e instanceof PdfDownloadQuotaError) {
      return NextResponse.json(
        {
          error: 'PDF_DOWNLOAD_QUOTA_EXCEEDED',
          limit: e.limit,
          message: `Limite de ${e.limit} downloads por mês atingido.`
        },
        { status: 429 }
      )
    }
    if (e instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    console.error('[library/download/request]', e)
    return NextResponse.json({ error: 'DOWNLOAD_REQUEST_FAILED' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/requireAuth'
import { createOrReusePdfJob, PdfJobQuotaError, publicPdfJobStatus } from '@/lib/library/pdf-download-jobs'
import { getPdfProductForDownload, PdfDownloadAccessError } from '@/lib/library/validate-pdf-download'
import { enqueuePdfDownload, isPdfDownloadWorkerAvailable } from '@/lib/queues/pdf-download-queue'
import { isR2PrivateStorageConfigured } from '@/lib/r2'
import { assertPdfDownloadQuota, PdfDownloadQuotaError } from '@/lib/library/pdf-download-limits'
import { createPdfDownloadToken } from '@/lib/library/pdf-download-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({ productId: z.string().uuid('productId invalido') })

function useAsyncDownload(productId: string): boolean {
  if (process.env.PDF_ASYNC_DOWNLOAD_ENABLED !== 'true') return false
  const configured = process.env.PDF_ASYNC_DOWNLOAD_PRODUCT_IDS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? []
  return configured.length === 0 || configured.includes(productId)
}

export async function POST(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/library/download/request' })
  if (auth.ok === false) return auth.response

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_BODY', details: parsed.error.flatten() }, { status: 400 })
    }

    const { product, locale } = await getPdfProductForDownload(parsed.data.productId, auth.user)
    if (!product.mediaFileName) throw new PdfDownloadAccessError('PDF_SOURCE_NOT_CONFIGURED', 404)

    if (!useAsyncDownload(product.id)) {
      const quota = await assertPdfDownloadQuota(auth.user.id)
      const { token, expiresAt } = await createPdfDownloadToken(auth.user.id, product.id)
      const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || request.nextUrl.origin
      return NextResponse.json({
        downloadUrl: `${origin}/api/library/download/file?token=${encodeURIComponent(token)}`,
        expiresAt: expiresAt.toISOString(),
        expiresInSeconds: Math.round((expiresAt.getTime() - Date.now()) / 1000),
        quota
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (!isR2PrivateStorageConfigured() || !(await isPdfDownloadWorkerAvailable())) {
      return NextResponse.json(
        { error: 'PDF_PREPARATION_TEMPORARILY_UNAVAILABLE', retryable: true },
        { status: 503, headers: { 'Retry-After': '30' } }
      )
    }

    const job = await createOrReusePdfJob({
      userId: auth.user.id,
      productId: product.id,
      locale,
      sourceMediaFile: product.mediaFileName,
      sourcePermission: product.permissionKey,
      fileLabel: product.title
    })

    if (job.status === 'PENDING') {
      try {
        await enqueuePdfDownload(job.id)
      } catch (error) {
        const { prisma } = await import('@/lib/prisma')
        await prisma.pdfDownloadJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorCode: 'QUEUE_UNAVAILABLE' }
        })
        throw error
      }
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: publicPdfJobStatus(job.status),
        pollAfterMs: 2000
      },
      { status: job.status === 'READY' ? 200 : 202, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof PdfJobQuotaError) {
      return NextResponse.json(
        { error: 'PDF_DOWNLOAD_QUOTA_EXCEEDED', limit: error.limit, message: `Limite de ${error.limit} downloads por mes atingido.` },
        { status: 429 }
      )
    }
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

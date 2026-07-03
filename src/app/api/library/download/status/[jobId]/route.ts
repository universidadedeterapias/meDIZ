import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { publicPdfJobStatus } from '@/lib/library/pdf-download-jobs'
import { getPdfProductForDownload, PdfDownloadAccessError } from '@/lib/library/validate-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requireUser({ pathname: '/api/library/download/status' })
  if (auth.ok === false) return auth.response
  const { jobId } = await context.params
  const job = await prisma.pdfDownloadJob.findFirst({
    where: { id: jobId, userId: auth.user.id },
    select: { id: true, productId: true, status: true, errorCode: true, expiresAt: true }
  })
  if (!job) return NextResponse.json({ error: 'PDF_JOB_NOT_FOUND' }, { status: 404 })

  try {
    await getPdfProductForDownload(job.productId, auth.user)
  } catch (error) {
    if (error instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

  const effectiveStatus = job.status === 'READY' && job.expiresAt <= new Date()
    ? 'EXPIRED'
    : job.status

  return NextResponse.json(
    {
      jobId: job.id,
      status: publicPdfJobStatus(effectiveStatus),
      error: effectiveStatus === 'FAILED' ? job.errorCode ?? 'PDF_PREPARATION_FAILED' : undefined,
      retryable: effectiveStatus === 'FAILED' || effectiveStatus === 'EXPIRED',
      pollAfterMs: effectiveStatus === 'PENDING' || effectiveStatus === 'PROCESSING' ? 2500 : undefined
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

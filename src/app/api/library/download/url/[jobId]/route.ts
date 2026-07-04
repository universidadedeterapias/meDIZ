import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'
import { createR2PrivatePresignedGetUrl } from '@/lib/r2'
import { getPdfProductForDownload, PdfDownloadAccessError } from '@/lib/library/validate-pdf-download'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const auth = await requireUser({ pathname: '/api/library/download/url' })
  if (auth.ok === false) return auth.response
  const { jobId } = await context.params

  try {
    const job = await prisma.pdfDownloadJob.findFirst({
      where: { id: jobId, userId: auth.user.id },
      select: { productId: true, status: true, r2Key: true, fileName: true, expiresAt: true }
    })
    if (!job) return NextResponse.json({ error: 'PDF_JOB_NOT_FOUND' }, { status: 404 })
    if (job.status !== 'READY' || !job.r2Key || !job.fileName || job.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'PDF_JOB_NOT_READY' }, { status: 409 })
    }

    await getPdfProductForDownload(job.productId, auth.user)
    const downloadUrl = await createR2PrivatePresignedGetUrl(job.r2Key, job.fileName, 10 * 60)
    return NextResponse.json(
      { downloadUrl, expiresInSeconds: 600 },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof PdfDownloadAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[library/download/url]', error)
    return NextResponse.json({ error: 'PDF_DOWNLOAD_URL_FAILED' }, { status: 500 })
  }
}

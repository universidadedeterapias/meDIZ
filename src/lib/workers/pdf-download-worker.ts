import type { CatalogPermissionKey } from '@prisma/client'
import { Worker, type Job } from 'bullmq'
import type { LanguageCode } from '@/i18n/config'
import { getBullMqRedisConnection } from '@/lib/bullmq-connection'
import { prisma } from '@/lib/prisma'
import { deletePrivateFromR2, uploadPrivateBufferToR2 } from '@/lib/r2'
import { fetchOriginalPdfBytes } from '@/lib/library/fetch-pdf-bytes'
import { safePdfFilename } from '@/lib/library/pdf-download-job-utils'
import { applyPdfWatermark, formatCpfForDisplay, resolveDisplayName } from '@/lib/library/watermark-pdf'
import { publishPdfWorkerHeartbeat, type PdfDownloadJobData } from '@/lib/queues/pdf-download-queue'
import { getPdfProductForDownload } from '@/lib/library/validate-pdf-download'

const connection = getBullMqRedisConnection()

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : 'UNKNOWN'
  if (message.includes('NOT_FOUND')) return 'SOURCE_NOT_FOUND'
  if (message.includes('FETCH')) return 'SOURCE_FETCH_FAILED'
  return 'PDF_PREPARATION_FAILED'
}

async function preparePdf(job: Job<PdfDownloadJobData>) {
  const started = Date.now()
  const row = await prisma.pdfDownloadJob.findUnique({
    where: { id: job.data.jobId },
    include: { user: { select: { fullName: true, name: true, email: true, cpf: true } } }
  })
  if (!row) throw new Error('PDF_JOB_NOT_FOUND')
  if (row.status === 'READY' && row.r2Key && row.expiresAt > new Date()) return

  await prisma.pdfDownloadJob.update({
    where: { id: row.id },
    data: { status: 'PROCESSING', startedAt: new Date(), errorCode: null, attempts: { increment: 1 } }
  })

  const before = process.memoryUsage().rss
  const r2Key = `generated-pdfs/${row.id}.pdf`
  let uploaded = false
  try {
    if (row.r2Key) await deletePrivateFromR2(row.r2Key)
    const current = await getPdfProductForDownload(
      row.productId,
      { id: row.userId, email: row.user.email },
      row.locale as LanguageCode
    )
    if (!current.product.mediaFileName) throw new Error('PDF_SOURCE_NOT_CONFIGURED')
    const original = await fetchOriginalPdfBytes(
      current.product.permissionKey as CatalogPermissionKey,
      current.product.mediaFileName,
      current.locale
    )
    const watermarked = await applyPdfWatermark(
      original,
      {
        fullName: resolveDisplayName(row.user.fullName, row.user.name, row.user.email),
        email: row.user.email,
        cpf: formatCpfForDisplay(row.user.cpf)
      },
      row.fileLabel
    )
    const output = Buffer.from(watermarked)
    await uploadPrivateBufferToR2(r2Key, output, 'application/pdf')
    uploaded = true

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.pdfDownloadJob.updateMany({
        where: { id: row.id, countedAt: null },
        data: { countedAt: new Date() }
      })
      if (claimed.count === 1) {
        await tx.pdfDownload.create({
          data: {
            userId: row.userId,
            productId: row.productId,
            fileLabel: row.fileLabel,
            userAgent: 'pdf-download-worker'
          }
        })
      }
      await tx.pdfDownloadJob.update({
        where: { id: row.id },
        data: {
          status: 'READY',
          r2Key,
          fileName: safePdfFilename(row.fileLabel),
          sizeBytes: output.byteLength,
          completedAt: new Date(),
          errorCode: null
        }
      })
    })

    console.info('[PdfDownloadWorker] ready', {
      jobId: row.id,
      inputBytes: original.byteLength,
      outputBytes: output.byteLength,
      durationMs: Date.now() - started,
      rssBefore: before,
      rssAfter: process.memoryUsage().rss
    })
  } catch (error) {
    let orphanedKey: string | null = row.r2Key
    if (uploaded) {
      try {
        await deletePrivateFromR2(r2Key)
        orphanedKey = null
      } catch {
        orphanedKey = r2Key
      }
    }
    const maxAttempts = Number(job.opts.attempts ?? 1)
    const finalAttempt = job.attemptsMade + 1 >= maxAttempts
    await prisma.pdfDownloadJob.update({
      where: { id: row.id },
      data: {
        status: finalAttempt ? 'FAILED' : 'PENDING',
        errorCode: errorCode(error),
        r2Key: orphanedKey
      }
    })
    console.error('[PdfDownloadWorker] failed', { jobId: row.id, code: errorCode(error) })
    throw error
  }
}

export const pdfDownloadWorker = connection
  ? new Worker<PdfDownloadJobData>('pdf-downloads', preparePdf, {
      connection,
      concurrency: Number(process.env.PDF_DOWNLOAD_WORKER_CONCURRENCY ?? 1),
      lockDuration: 10 * 60 * 1000
    })
  : null

export async function cleanupExpiredPdfJobs(): Promise<void> {
  const expired = await prisma.pdfDownloadJob.findMany({
    where: { expiresAt: { lte: new Date() }, status: { in: ['READY', 'FAILED'] } },
    select: { id: true, r2Key: true },
    take: 25
  })
  for (const row of expired) {
    if (row.r2Key) {
      try {
        await deletePrivateFromR2(row.r2Key)
      } catch {
        console.error('[PdfDownloadWorker] cleanup failed', { jobId: row.id })
        continue
      }
    }
    await prisma.pdfDownloadJob.update({
      where: { id: row.id },
      data: { status: 'EXPIRED', r2Key: null, sizeBytes: null }
    })
  }
}

let heartbeatTimer: ReturnType<typeof setInterval> | undefined
let cleanupTimer: ReturnType<typeof setInterval> | undefined

async function runMaintenance(
  name: 'heartbeat' | 'cleanup',
  operation: () => Promise<void>
): Promise<void> {
  try {
    await operation()
  } catch (error) {
    // Falhas temporárias de Redis/R2 não devem encerrar o processo do worker.
    console.error(`[PdfDownloadWorker] ${name} failed`, error)
  }
}

export function startPdfDownloadWorkerMaintenance(): void {
  if (!pdfDownloadWorker || heartbeatTimer) return
  void runMaintenance('heartbeat', publishPdfWorkerHeartbeat)
  heartbeatTimer = setInterval(
    () => void runMaintenance('heartbeat', publishPdfWorkerHeartbeat),
    15_000
  )
  cleanupTimer = setInterval(
    () => void runMaintenance('cleanup', cleanupExpiredPdfJobs),
    10 * 60_000
  )
}

export async function closePdfDownloadWorker(): Promise<void> {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (cleanupTimer) clearInterval(cleanupTimer)
  await pdfDownloadWorker?.close()
}

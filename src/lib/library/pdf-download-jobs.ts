import { Prisma } from '@prisma/client'
import type { LanguageCode } from '@/i18n/config'
import { prisma } from '@/lib/prisma'
import { getPdfDownloadMonthlyLimit } from './pdf-download-limits'

import { PDF_WATERMARK_VERSION, pdfJobDedupeKey } from './pdf-download-job-utils'
export { publicPdfJobStatus } from './pdf-download-job-utils'

const ARTIFACT_TTL_MS = 48 * 60 * 60 * 1000

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export class PdfJobQuotaError extends Error {
  readonly limit: number
  constructor(limit: number) {
    super('PDF_DOWNLOAD_QUOTA_EXCEEDED')
    this.limit = limit
  }
}

export async function createOrReusePdfJob(input: {
  userId: string
  productId: string
  locale: LanguageCode
  sourceMediaFile: string
  sourcePermission: string
  fileLabel: string
}) {
  const now = new Date()
  const dedupeKey = pdfJobDedupeKey(input.userId, input.productId, now)
  const limit = getPdfDownloadMonthlyLimit()

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.pdfDownloadJob.findUnique({ where: { dedupeKey } })
        if (existing && !(
          existing.status === 'FAILED' ||
          existing.status === 'EXPIRED' ||
          (existing.status === 'READY' && existing.expiresAt <= now)
        )) {
          return existing
        }

        const [completed, reserved] = await Promise.all([
          tx.pdfDownload.count({
            where: { userId: input.userId, createdAt: { gte: monthStart(now) } }
          }),
          tx.pdfDownloadJob.count({
            where: {
              userId: input.userId,
              createdAt: { gte: monthStart(now) },
              countedAt: null,
              status: { in: ['PENDING', 'PROCESSING'] }
            }
          })
        ])
        if ((!existing || !existing.countedAt) && completed + reserved >= limit) {
          throw new PdfJobQuotaError(limit)
        }

        if (existing) {
          return tx.pdfDownloadJob.update({
            where: { id: existing.id },
            data: {
              status: 'PENDING',
              locale: input.locale,
              sourceMediaFile: input.sourceMediaFile,
              sourcePermission: input.sourcePermission,
              fileLabel: input.fileLabel,
              fileName: null,
              sizeBytes: null,
              errorCode: null,
              startedAt: null,
              completedAt: null,
              expiresAt: new Date(now.getTime() + ARTIFACT_TTL_MS)
            }
          })
        }

        return tx.pdfDownloadJob.create({
          data: {
            userId: input.userId,
            productId: input.productId,
            locale: input.locale,
            sourceMediaFile: input.sourceMediaFile,
            sourcePermission: input.sourcePermission,
            fileLabel: input.fileLabel,
            dedupeKey,
            watermarkVersion: PDF_WATERMARK_VERSION,
            expiresAt: new Date(now.getTime() + ARTIFACT_TTL_MS)
          }
        })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2034' || error.code === 'P2002') &&
        attempt < 2
      ) continue
      throw error
    }
  }
  throw new Error('PDF_JOB_TRANSACTION_FAILED')
}

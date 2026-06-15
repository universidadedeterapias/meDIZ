import { prisma } from '@/lib/prisma'

const DEFAULT_MONTHLY_LIMIT = 3

export function getPdfDownloadMonthlyLimit(): number {
  const raw = process.env.PDF_DOWNLOAD_MONTHLY_LIMIT
  if (!raw) return DEFAULT_MONTHLY_LIMIT
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHLY_LIMIT
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
}

export async function countUserPdfDownloadsThisMonth(userId: string): Promise<number> {
  return prisma.pdfDownload.count({
    where: {
      userId,
      createdAt: { gte: startOfCurrentMonthUtc() }
    }
  })
}

export async function assertPdfDownloadQuota(userId: string): Promise<{
  used: number
  limit: number
  remaining: number
}> {
  const limit = getPdfDownloadMonthlyLimit()
  const used = await countUserPdfDownloadsThisMonth(userId)
  if (used >= limit) {
    throw new PdfDownloadQuotaError(limit)
  }
  return { used, limit, remaining: limit - used }
}

export class PdfDownloadQuotaError extends Error {
  readonly limit: number
  constructor(limit: number) {
    super('PDF_DOWNLOAD_QUOTA_EXCEEDED')
    this.name = 'PdfDownloadQuotaError'
    this.limit = limit
  }
}

export async function logPdfDownload(input: {
  userId: string
  productId: string
  fileLabel: string
  clientIp?: string | null
  userAgent?: string | null
}): Promise<void> {
  await prisma.pdfDownload.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      fileLabel: input.fileLabel,
      clientIp: input.clientIp ?? null,
      userAgent: input.userAgent ?? null
    }
  })
}

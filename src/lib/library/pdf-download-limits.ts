import { prisma } from '@/lib/prisma'
import { isCacheFresh } from '@/lib/library/pdf-download-cache'

/**
 * Teto mensal de cópias licenciadas geradas por pessoa.
 *
 * Fica DESLIGADO enquanto `PDF_DOWNLOAD_MONTHLY_LIMIT` não estiver definida. Até
 * agora esta checagem existia no código e não era chamada por ninguém — dava a
 * impressão de haver um limite que não havia. Em vez de ligar um teto de 3 por
 * mês em cima de quem já compra hoje, virou uma chave: quem decide o número, e
 * quando, é quem cuida do produto, não o padrão de um arquivo.
 */
export function getPdfDownloadMonthlyLimit(): number | null {
  const raw = process.env.PDF_DOWNLOAD_MONTHLY_LIMIT?.trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
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

/**
 * Barra a GERAÇÃO de uma cópia nova, nunca o download de uma que já existe.
 *
 * `cacheKey` é o que separa as duas coisas: se o arquivo daquele mês já está em
 * cache, baixar de novo não custa nada e não é uma cópia a mais. Sem essa
 * distinção, quem baixou no celular e quis o mesmo arquivo no computador seria
 * recusado por um limite que ele não gastou.
 */
export async function assertPdfDownloadQuota(
  userId: string,
  cacheKey?: string
): Promise<{ used: number; limit: number | null; remaining: number | null }> {
  const limit = getPdfDownloadMonthlyLimit()
  if (limit === null) {
    return { used: 0, limit: null, remaining: null }
  }

  if (cacheKey && (await isCacheFresh(cacheKey))) {
    const used = await countUserPdfDownloadsThisMonth(userId)
    return { used, limit, remaining: Math.max(0, limit - used) }
  }

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

import type { PdfDownloadJobStatus } from '@prisma/client'

export const PDF_WATERMARK_VERSION = 'v1'

export function safePdfFilename(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'documento'
  return `${base}-licenciado.pdf`
}

function monthKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function pdfJobDedupeKey(userId: string, productId: string, now = new Date()): string {
  return `${userId}:${productId}:${PDF_WATERMARK_VERSION}:${monthKey(now)}`
}

export function publicPdfJobStatus(status: PdfDownloadJobStatus) {
  return status.toLowerCase() as Lowercase<PdfDownloadJobStatus>
}

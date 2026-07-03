import { closePdfDownloadWorker, pdfDownloadWorker, startPdfDownloadWorkerMaintenance } from '../src/lib/workers/pdf-download-worker'

if (!pdfDownloadWorker) {
  console.error('[PdfDownloadWorker] REDIS_URL ausente ou invalida')
  process.exit(1)
}

startPdfDownloadWorkerMaintenance()
console.info('[PdfDownloadWorker] iniciado com concorrencia controlada')

async function shutdown() {
  await closePdfDownloadWorker()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())

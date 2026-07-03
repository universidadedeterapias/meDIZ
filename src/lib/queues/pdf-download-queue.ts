import { Queue } from 'bullmq'
import { getBullMqRedisConnection } from '@/lib/bullmq-connection'
import { getRedisClient } from '@/lib/redis'

export type PdfDownloadJobData = { jobId: string }
const connection = getBullMqRedisConnection()
const HEARTBEAT_KEY = 'workers:pdf-download:heartbeat'

export const pdfDownloadQueue = connection
  ? new Queue<PdfDownloadJobData>('pdf-downloads', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 3600, count: 500 },
        removeOnFail: { age: 7 * 24 * 3600, count: 500 }
      }
    })
  : null

export async function isPdfDownloadWorkerAvailable(): Promise<boolean> {
  const redis = getRedisClient()
  if (!redis || !pdfDownloadQueue) return false
  const heartbeat = Number(await redis.get(HEARTBEAT_KEY))
  return Number.isFinite(heartbeat) && Date.now() - heartbeat < 60_000
}

export async function publishPdfWorkerHeartbeat(): Promise<void> {
  const redis = getRedisClient()
  if (redis) await redis.set(HEARTBEAT_KEY, String(Date.now()), 'EX', 75)
}

export async function enqueuePdfDownload(jobId: string) {
  if (!pdfDownloadQueue) throw new Error('PDF_DOWNLOAD_QUEUE_UNAVAILABLE')
  const existing = await pdfDownloadQueue.getJob(jobId)
  if (existing) {
    const state = await existing.getState()
    if (state === 'completed' || state === 'failed') await existing.remove()
    else return existing
  }
  return pdfDownloadQueue.add('prepare-pdf', { jobId }, { jobId })
}

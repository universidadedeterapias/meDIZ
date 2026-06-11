import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }
  return value
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ENDPOINT?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim() &&
      process.env.R2_PUBLIC_URL?.trim()
  )
}

export const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ACCOUNT_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? ''
  },
  forcePathStyle: true
})

export function getR2Bucket(): string {
  return requireEnv('R2_BUCKET')
}

export function getR2PublicUrlBase(): string {
  return requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '')
}

export function buildR2PublicUrl(key: string): string {
  return `${getR2PublicUrlBase()}/${key}`
}

export function extractR2KeyFromUrl(url: string): string | null {
  try {
    const base = getR2PublicUrlBase()
    const normalized = url.trim()
    if (!normalized.startsWith(`${base}/`)) return null
    return normalized.slice(base.length + 1)
  } catch {
    return null
  }
}

export function generateR2ObjectKey(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return ext ? `${unique}.${ext}` : unique
}

export async function createR2PresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType
    }),
    { expiresIn }
  )
}

export async function uploadBufferToR2(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; key: string }> {
  const key = generateR2ObjectKey(fileName)
  await r2.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  )
  return { url: buildR2PublicUrl(key), key }
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key
    })
  )
}

export function getR2PublicHostname(): string | null {
  try {
    return new URL(getR2PublicUrlBase()).hostname
  } catch {
    return null
  }
}

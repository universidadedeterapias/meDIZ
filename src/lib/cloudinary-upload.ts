import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import { Readable } from 'stream'

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
}

export function ensureCloudinaryConfig(): void {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export function isAllowedImageFile(file: File): boolean {
  if (ALLOWED_TYPES.includes(file.type)) return true
  return /\.(jpe?g|png|webp)$/i.test(file.name)
}

export async function uploadImageStream(
  buffer: Buffer,
  options: {
    folder: string
    publicId?: string
  }
): Promise<UploadApiResponse> {
  ensureCloudinaryConfig()
  const stream = Readable.from(buffer)

  return new Promise((resolve, reject) => {
    const uploader = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        overwrite: true,
        resource_type: 'image'
      },
      (err, result) => {
        if (err) return reject(err)
        if (!result) return reject(new Error('upload_failed'))
        resolve(result)
      }
    )
    stream.pipe(uploader)
  })
}

export function cloudinaryErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message: string }).message)
    if (msg.includes('Invalid cloud_name')) {
      return 'Cloudinary: CLOUDINARY_CLOUD_NAME inválido no .env'
    }
    if (msg.includes('Invalid API Key')) {
      return 'Cloudinary: chaves de API inválidas no .env'
    }
    return `Cloudinary: ${msg}`
  }
  return 'Falha no upload'
}

export type CloudinaryResourceType = 'image' | 'video' | 'raw'

const ALLOWED_MEDIA: Record<
  CloudinaryResourceType,
  { mime: string[]; ext: RegExp; maxBytes: number }
> = {
  image: {
    mime: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ext: /\.(jpe?g|png|webp)$/i,
    maxBytes: 5 * 1024 * 1024
  },
  video: {
    mime: ['audio/mpeg', 'audio/mp3', 'video/mp4', 'audio/mp4'],
    ext: /\.(mp3|mp4)$/i,
    maxBytes: 100 * 1024 * 1024
  },
  raw: {
    mime: ['application/pdf'],
    ext: /\.pdf$/i,
    maxBytes: 50 * 1024 * 1024
  }
}

export function detectResourceType(file: File): CloudinaryResourceType | null {
  if (isAllowedImageFile(file)) return 'image'
  const name = file.name.toLowerCase()
  if (ALLOWED_MEDIA.video.mime.includes(file.type) || ALLOWED_MEDIA.video.ext.test(name)) {
    return 'video'
  }
  if (ALLOWED_MEDIA.raw.mime.includes(file.type) || ALLOWED_MEDIA.raw.ext.test(name)) {
    return 'raw'
  }
  return null
}

export function validateMediaFile(
  file: File,
  resourceType: CloudinaryResourceType
): string | null {
  const rules = ALLOWED_MEDIA[resourceType]
  if (!rules.mime.includes(file.type) && !rules.ext.test(file.name)) {
    if (resourceType === 'image') return 'Use JPEG, PNG ou WebP'
    if (resourceType === 'video') return 'Use MP3 ou MP4'
    return 'Use PDF'
  }
  if (file.size > rules.maxBytes) {
    const mb = Math.round(rules.maxBytes / (1024 * 1024))
    return `Arquivo muito grande (máximo ${mb}MB)`
  }
  return null
}

export async function uploadMediaStream(
  buffer: Buffer,
  options: {
    folder: string
    publicId?: string
    resourceType: CloudinaryResourceType
  }
): Promise<UploadApiResponse> {
  ensureCloudinaryConfig()
  const stream = Readable.from(buffer)

  return new Promise((resolve, reject) => {
    const uploader = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        overwrite: true,
        resource_type: options.resourceType
      },
      (err, result) => {
        if (err) return reject(err)
        if (!result) return reject(new Error('upload_failed'))
        resolve(result)
      }
    )
    stream.pipe(uploader)
  })
}

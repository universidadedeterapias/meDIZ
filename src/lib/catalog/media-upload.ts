import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import {
  cloudinaryErrorMessage,
  detectResourceType,
  isCloudinaryConfigured as cloudinaryConfigured,
  uploadMediaStream,
  validateMediaFile,
  type CloudinaryResourceType
} from '@/lib/cloudinary-upload'
import { toPublicUrl } from '@/lib/library/contentPaths'

export type CatalogMediaKind = 'cover' | 'pdf' | 'audio'

export function kindToResourceType(
  kind: CatalogMediaKind,
  file: File
): CloudinaryResourceType {
  if (kind === 'cover') return 'image'
  if (kind === 'pdf') return 'raw'
  return detectResourceType(file) === 'video' ? 'video' : 'video'
}

export function validateCatalogMediaFile(
  file: File,
  kind: CatalogMediaKind
): string | null {
  const resourceType = kindToResourceType(kind, file)
  return validateMediaFile(file, resourceType)
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)
}

function localSubdir(kind: CatalogMediaKind): string {
  switch (kind) {
    case 'pdf':
      return path.join('pdf', 'uploads')
    case 'audio':
      return path.join('audioterapias', 'uploads')
    default:
      return 'uploads'
  }
}

export function isCloudinaryConfigured(): boolean {
  return cloudinaryConfigured()
}

export function isRemoteMediaRef(ref: string | null | undefined): boolean {
  if (!ref?.trim()) return false
  return /^https?:\/\//i.test(ref.trim())
}

export type CatalogMediaUploadResult = {
  mediaRef: string
  publicUrl: string
  storage: 'cloudinary' | 'local'
}

export async function saveCatalogMediaFile(
  buffer: Buffer,
  originalName: string,
  kind: CatalogMediaKind,
  options?: { audioterapiaFolder?: string }
): Promise<CatalogMediaUploadResult> {
  const fileStub = new File([buffer], originalName)
  const validationError = validateCatalogMediaFile(fileStub, kind)
  if (validationError) {
    throw new Error(validationError)
  }

  const safeName = sanitizeFileName(originalName)
  const stamp = Date.now()

  if (cloudinaryConfigured()) {
    const resourceType = kindToResourceType(kind, fileStub)
    const folder =
      kind === 'cover'
        ? 'mediz/catalog'
        : kind === 'pdf'
          ? 'mediz/catalog/pdf'
          : 'mediz/catalog/audioterapia'

    try {
      const result = await uploadMediaStream(buffer, {
        folder,
        publicId: `${kind}-${stamp}-${safeName.replace(/\.[^.]+$/, '')}`,
        resourceType
      })
      return {
        mediaRef: result.secure_url,
        publicUrl: result.secure_url,
        storage: 'cloudinary'
      }
    } catch (error) {
      throw new Error(cloudinaryErrorMessage(error))
    }
  }

  const relativeDir =
    kind === 'audio' && options?.audioterapiaFolder
      ? path.join(
          'biblioteca',
          'audioterapias',
          options.audioterapiaFolder
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[<>:"/\\|?*]+/g, '-')
            .trim()
        )
      : path.join('biblioteca', localSubdir(kind))
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
  await mkdir(absoluteDir, { recursive: true })

  const fileName = `${stamp}-${safeName}`
  const relativeFile = path.join(relativeDir, fileName).split(path.sep).join('/')

  await writeFile(path.join(process.cwd(), 'public', relativeFile), buffer)

  return {
    mediaRef: relativeFile,
    publicUrl: toPublicUrl(relativeFile),
    storage: 'local'
  }
}

import {
  detectResourceType,
  validateMediaFile,
  type CloudinaryResourceType
} from '@/lib/cloudinary-upload'
import {
  guessContentTypeFromFileName,
  R2_MAX_BYTES
} from '@/lib/catalog/r2-media-policy'
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2'

export type CatalogMediaKind = 'cover' | 'pdf' | 'audio' | 'video'

export function kindToResourceType(
  kind: CatalogMediaKind,
  file: File
): CloudinaryResourceType {
  if (kind === 'cover') return 'image'
  if (kind === 'pdf') return 'raw'
  if (kind === 'video') return 'video'
  return detectResourceType(file) === 'video' ? 'video' : 'video'
}

export function validateCatalogMediaFile(
  file: File,
  kind: CatalogMediaKind
): string | null {
  const resourceType = kindToResourceType(kind, file)
  const baseError = validateMediaFile(file, resourceType)
  if (baseError) return baseError
  if (file.size > R2_MAX_BYTES) {
    return 'Arquivo muito grande (máximo 200 MB)'
  }
  return null
}

export function isRemoteMediaRef(ref: string | null | undefined): boolean {
  if (!ref?.trim()) return false
  return /^https?:\/\//i.test(ref.trim())
}

export type CatalogMediaUploadResult = {
  mediaRef: string
  publicUrl: string
  storage: 'r2'
}

/** Upload server-side (scripts/CLI). No admin, prefira URL pré-assinada no navegador. */
export async function saveCatalogMediaFile(
  buffer: Buffer,
  originalName: string,
  kind: CatalogMediaKind
): Promise<CatalogMediaUploadResult> {
  const fileStub = new File([buffer], originalName)
  const validationError = validateCatalogMediaFile(fileStub, kind)
  if (validationError) {
    throw new Error(validationError)
  }

  if (!isR2Configured()) {
    throw new Error('Storage R2 não configurado no servidor.')
  }

  const contentType = guessContentTypeFromFileName(originalName)
  const { url } = await uploadBufferToR2(buffer, originalName, contentType)

  return {
    mediaRef: url,
    publicUrl: url,
    storage: 'r2'
  }
}

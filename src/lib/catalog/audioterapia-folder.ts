import path from 'path'
import type { CatalogMediaItem } from '@/lib/catalog/types'

export function ensureAudioterapiaFolderName(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return 'Audioterapia'
  if (/^audioterapia\s/i.test(trimmed)) return trimmed
  return `Audioterapia ${trimmed}`
}

function extractLeadingNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)\s*[-_.]/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function localeFromMediaPath(filePath: string): string {
  const n = normalizeForMatch(filePath.replace(/\\/g, '/'))
  if (/versao br[- ]?pt|br[- ]?pt\//.test(n)) return 'pt-BR'
  if (/versao br|portugues/.test(n) && !/espanhol|espanol|ingles|english/.test(n)) {
    return 'pt-BR'
  }
  if (/espanhol|espanol/.test(n)) return 'es'
  if (/ingles|english|ingl/.test(n)) return 'en'
  return 'pt-BR'
}

function titleFromMediaBasename(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath))
  const cleaned = base.replace(/^\d+\s*[-_.]\s*/, '').trim()
  return cleaned || base
}

export function buildMediaItemsFromRefs(
  refs: { mediaFileName: string; originalName: string }[]
): CatalogMediaItem[] {
  const items = refs.map((ref, index) => ({
    id: `track-${index}`,
    title: titleFromMediaBasename(ref.originalName),
    mediaFileName: ref.mediaFileName.replace(/\\/g, '/'),
    locale: localeFromMediaPath(ref.mediaFileName),
    sortOrder:
      extractLeadingNumber(path.basename(ref.originalName)) || index
  }))

  const localeOrder: Record<string, number> = {
    'pt-BR': 0,
    'pt-PT': 1,
    en: 2,
    es: 3
  }

  return items
    .sort((a, b) => {
      const la = localeOrder[a.locale ?? 'pt-BR'] ?? 9
      const lb = localeOrder[b.locale ?? 'pt-BR'] ?? 9
      if (la !== lb) return la - lb
      return a.sortOrder - b.sortOrder
    })
    .map((item, index) => ({
      ...item,
      id: `track-${index}`,
      sortOrder: index
    }))
}

function trackLocaleFromProduct(productLocale?: string | null): string | undefined {
  const normalized = productLocale?.trim()
  if (!normalized) return undefined
  if (normalized === 'pt') return 'pt'
  return normalized
}

export function buildAudioterapiaPackageFromUploads(
  folderTitle: string,
  uploads: { url: string; originalName: string }[],
  productLocale?: string | null
): {
  folderName: string
  mediaItems: CatalogMediaItem[]
  primaryMediaFileName: string
} {
  if (uploads.length === 0) {
    throw new Error('Envie ao menos um arquivo MP3 ou MP4.')
  }

  for (const file of uploads) {
    if (!/\.(mp3|mp4)$/i.test(file.originalName)) {
      throw new Error(
        `Formato não suportado: ${file.originalName}. Use MP3 ou MP4.`
      )
    }
    if (!file.url?.trim()) {
      throw new Error(`URL ausente para ${file.originalName}`)
    }
  }

  const folderName = ensureAudioterapiaFolderName(folderTitle)
  const refs = uploads.map((file) => ({
    mediaFileName: file.url.trim(),
    originalName: file.originalName
  }))

  const trackLocale = trackLocaleFromProduct(productLocale)
  const mediaItems = buildMediaItemsFromRefs(refs).map((item) => ({
    ...item,
    ...(trackLocale ? { locale: trackLocale } : {})
  }))
  const primaryMediaFileName =
    mediaItems[mediaItems.length - 1]?.mediaFileName ??
    refs[0]?.mediaFileName ??
    ''

  return { folderName, mediaItems, primaryMediaFileName }
}

import path from 'path'
import { mkdir, writeFile } from 'fs/promises'
import type { CatalogMediaItem } from '@/lib/catalog/types'
import {
  saveCatalogMediaFile,
  isCloudinaryConfigured
} from '@/lib/catalog/media-upload'

export function ensureAudioterapiaFolderName(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return 'Audioterapia'
  if (/^audioterapia\s/i.test(trimmed)) return trimmed
  return `Audioterapia ${trimmed}`
}

function sanitizeFolderSegment(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
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

async function saveLocalAudioterapiaFile(
  buffer: Buffer,
  folderName: string,
  originalName: string
): Promise<string> {
  const safeFolder = sanitizeFolderSegment(folderName)
  const safeFile = originalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120)

  const relativeDir = path.join('biblioteca', 'audioterapias', safeFolder)
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir)
  await mkdir(absoluteDir, { recursive: true })

  const relativeFile = path.join(relativeDir, safeFile).split(path.sep).join('/')
  await writeFile(path.join(process.cwd(), 'public', relativeFile), buffer)
  return relativeFile
}

export async function uploadAudioterapiaPackageFiles(
  folderTitle: string,
  files: { name: string; buffer: Buffer }[]
): Promise<{
  folderName: string
  mediaItems: CatalogMediaItem[]
  primaryMediaFileName: string
}> {
  const folderName = ensureAudioterapiaFolderName(folderTitle)
  const refs: { mediaFileName: string; originalName: string }[] = []

  for (const file of files) {
    if (!/\.(mp3|mp4)$/i.test(file.name)) {
      throw new Error(`Formato não suportado: ${file.name}. Use MP3 ou MP4.`)
    }

    let mediaFileName: string
    if (isCloudinaryConfigured()) {
      const result = await saveCatalogMediaFile(file.buffer, file.name, 'audio', {
        audioterapiaFolder: folderName
      })
      mediaFileName = result.mediaRef
    } else {
      mediaFileName = await saveLocalAudioterapiaFile(
        file.buffer,
        folderName,
        file.name
      )
    }

    refs.push({ mediaFileName, originalName: file.name })
  }

  const mediaItems = buildMediaItemsFromRefs(refs)
  const primaryMediaFileName =
    mediaItems[mediaItems.length - 1]?.mediaFileName ??
    refs[0]?.mediaFileName ??
    ''

  return { folderName, mediaItems, primaryMediaFileName }
}

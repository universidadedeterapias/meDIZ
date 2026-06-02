import path from 'path'
import { existsSync, readdirSync, type Dirent } from 'fs'
import type { LanguageCode } from '@/i18n/config'
import type { CatalogMediaItem } from '@/lib/catalog/types'
import { libraryLocaleCandidates } from './locale'

export type LibraryContentKey = 'audioterapia' | 'pdf' | 'livro_digital'

/** Estrutura preferida: dois PDFs por idioma. */
const PDF_VARIANT_FILES = ['material-1.pdf', 'material-2.pdf'] as const

const PDF_VARIANT_LABELS: Record<LanguageCode, [string, string]> = {
  'pt-BR': ['Material complementar 1', 'Material complementar 2'],
  'pt-PT': ['Material complementar 1', 'Material complementar 2'],
  en: ['Supplementary material 1', 'Supplementary material 2'],
  es: ['Material complementario 1', 'Material complementario 2']
}

function bibliotecaRoot(): string {
  return path.join(process.cwd(), 'public', 'biblioteca')
}

function relativePath(...segments: string[]): string {
  return path.join(...segments)
}

export function fileExists(relative: string): boolean {
  return existsSync(path.join(bibliotecaRoot(), relative))
}

function readDirSafe(relativeDir: string): string[] {
  const absolute = path.join(bibliotecaRoot(), relativeDir)
  if (!existsSync(absolute)) return []
  try {
    return readdirSync(absolute)
  } catch {
    return []
  }
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const LEGACY_LOCALE_PATTERNS: Record<LanguageCode, RegExp[]> = {
  'pt-BR': [/(^|[\s_.-])pt($|[\s_.-])/, /portugues/],
  'pt-PT': [/(^|[\s_.-])pt($|[\s_.-])/, /portugues/],
  en: [/(^|[\s_.-])en($|[\s_.-])/, /english/],
  es: [/(^|[\s_.-])es($|[\s_.-])/, /espanol/, /spanish/]
}

function findLegacyLocalizedFile(
  candidates: LanguageCode[],
  directories: string[],
  extension: string
): { relative: string; locale: LanguageCode } | null {
  for (const locale of candidates) {
    const patterns = LEGACY_LOCALE_PATTERNS[locale]
    for (const directory of directories) {
      const entries = readDirSafe(directory)
      for (const entry of entries) {
        const normalizedEntry = normalizeForMatch(entry)
        if (!normalizedEntry.endsWith(extension)) continue
        if (patterns.some((pattern) => pattern.test(normalizedEntry))) {
          return { relative: relativePath(directory, entry), locale }
        }
      }
    }
  }

  return null
}

function findFirstExisting(
  candidates: LanguageCode[],
  buildRelative: (locale: LanguageCode) => string
): { locale: LanguageCode; relative: string } | null {
  for (const locale of candidates) {
    const relative = buildRelative(locale)
    if (fileExists(relative)) {
      return { locale, relative }
    }
  }
  return null
}

const AUDIOTERAPIA_BASE_DIRS = ['audioterapia', 'audioterapias'] as const

function isMediaFile(name: string): boolean {
  return /\.(mp3|mp4)$/i.test(name)
}

function getAudioterapiaBaseDirs(): string[] {
  return AUDIOTERAPIA_BASE_DIRS.filter((dir) =>
    existsSync(path.join(bibliotecaRoot(), dir))
  )
}

function walkMediaFiles(relativeDir: string): string[] {
  const absolute = path.join(bibliotecaRoot(), relativeDir)
  if (!existsSync(absolute)) return []

  const results: string[] = []
  try {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const rel = relativePath(relativeDir, entry.name)
      if (entry.isDirectory()) {
        results.push(...walkMediaFiles(rel))
      } else if (isMediaFile(entry.name)) {
        results.push(rel)
      }
    }
  } catch {
    return results
  }

  return results
}

function extractLeadingNumber(fileName: string): number {
  const match = fileName.match(/^(\d+)\s*[-_.]/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function isAuxiliaryMedia(fileName: string): boolean {
  const normalized = normalizeForMatch(fileName)
  return /instruc|preparac|decodific|intro/.test(normalized)
}

function filterPreferredLocaleFiles(files: string[]): string[] {
  const normalized = (f: string) => normalizeForMatch(f.replace(/\\/g, '/'))

  const ptBr = files.filter((f) =>
    /versao br[- ]?pt|versao br\/|br[- ]?pt\//.test(normalized(f))
  )
  if (ptBr.length > 0) return ptBr

  const ptOnly = files.filter((f) => {
    const n = normalized(f)
    return (
      /versao br|portugues/.test(n) &&
      !/espanhol|espanol|english|ingles|ingl/.test(n)
    )
  })
  if (ptOnly.length > 0) return ptOnly

  const withoutAltLocales = files.filter((f) => {
    const n = normalized(f)
    return !/espanhol|espanol|english|ingles|ingl/.test(n)
  })
  if (withoutAltLocales.length > 0) return withoutAltLocales

  return files
}

function pickPrimaryMediaFile(files: string[]): string {
  if (files.length === 0) {
    throw new Error('pickPrimaryMediaFile requires at least one file')
  }
  if (files.length === 1) return files[0]

  let candidates = filterPreferredLocaleFiles(files)
  candidates = candidates.filter((file) => !isAuxiliaryMedia(path.basename(file)))
  if (candidates.length === 0) candidates = filterPreferredLocaleFiles(files)

  const mp4Files = candidates.filter((file) => /\.mp4$/i.test(file))
  if (mp4Files.length === 1) return mp4Files[0]
  if (mp4Files.length > 1) candidates = mp4Files

  return [...candidates].sort((a, b) => {
    const numDiff =
      extractLeadingNumber(path.basename(b)) -
      extractLeadingNumber(path.basename(a))
    if (numDiff !== 0) return numDiff
    return path.basename(b).length - path.basename(a).length
  })[0]
}

function toPosixRelative(relative: string): string {
  return relative.split(path.sep).join('/')
}

function cleanThemeTitle(folderName: string): string {
  return folderName.replace(/^Audioterapia\s+/i, '').trim() || folderName
}

export type AudioterapiaCatalogEntry = {
  themeKey: string
  title: string
  mediaFileName: string
  mediaItems: CatalogMediaItem[]
  allFiles: string[]
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

function buildMediaItemsFromFiles(files: string[]): CatalogMediaItem[] {
  const items = files.map((file, index) => ({
    id: `track-${index}`,
    title: titleFromMediaBasename(file),
    mediaFileName: toPosixRelative(file),
    locale: localeFromMediaPath(file),
    sortOrder:
      extractLeadingNumber(path.basename(file)) ||
      index
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

function themeKeyFromFolder(folderName: string): string {
  return normalizeForMatch(cleanThemeTitle(folderName))
}

/** Uma entrada por pasta de tema (ex.: audioterapias/Audioterapia Liberando Traumas/). */
export function listAudioterapiaCatalogEntries(): AudioterapiaCatalogEntry[] {
  const entries: AudioterapiaCatalogEntry[] = []

  for (const base of getAudioterapiaBaseDirs()) {
    const absoluteBase = path.join(bibliotecaRoot(), base)
    let dirEntries: Dirent[]
    try {
      dirEntries = readdirSync(absoluteBase, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of dirEntries) {
      const subRel = relativePath(base, entry.name)
      if (entry.isDirectory()) {
        const media = walkMediaFiles(subRel)
        if (media.length === 0) continue
        const posixFiles = media.map(toPosixRelative)
        const mediaItems = buildMediaItemsFromFiles(media)
        const primary = pickPrimaryMediaFile(media)
        entries.push({
          themeKey: themeKeyFromFolder(entry.name),
          title: cleanThemeTitle(entry.name),
          mediaFileName: toPosixRelative(primary),
          mediaItems,
          allFiles: posixFiles
        })
      } else if (isMediaFile(entry.name)) {
        const posix = toPosixRelative(subRel)
        entries.push({
          themeKey: themeKeyFromFolder(entry.name),
          title: stripMediaExtension(entry.name),
          mediaFileName: posix,
          mediaItems: buildMediaItemsFromFiles([subRel]),
          allFiles: [posix]
        })
      }
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

const AUDIO_EXTENSIONS = ['.mp4', '.mp3'] as const

function stripMediaExtension(name: string): string {
  return name.replace(/\.(mp3|mp4)$/i, '')
}

function audioterapiaCandidates(
  locale: LanguageCode,
  baseName: string
): string[] {
  const base = stripMediaExtension(baseName)
  const paths: string[] = []

  for (const rootDir of getAudioterapiaBaseDirs()) {
    for (const loc of libraryLocaleCandidates(locale)) {
      for (const ext of AUDIO_EXTENSIONS) {
        paths.push(relativePath(rootDir, loc, `${base}${ext}`))
        paths.push(relativePath(rootDir, `${loc}-${base}${ext}`))
        paths.push(relativePath(rootDir, `${base}-${loc}${ext}`))
      }
    }

    for (const ext of AUDIO_EXTENSIONS) {
      paths.push(relativePath(rootDir, `${base}${ext}`))
    }
  }

  return paths
}

function findMediaByBasename(baseName: string): string | null {
  const target = normalizeForMatch(stripMediaExtension(baseName))

  for (const base of getAudioterapiaBaseDirs()) {
    for (const file of walkMediaFiles(base)) {
      const fileBase = normalizeForMatch(
        stripMediaExtension(path.basename(file))
      )
      if (fileBase === target) {
        return toPosixRelative(file)
      }
    }
  }

  return null
}

/** Lista todos os MP3/MP4 encontrados (para admin). */
export function listAudioterapiaMediaFiles(): string[] {
  const entries = listAudioterapiaCatalogEntries()
  return [...new Set(entries.flatMap((entry) => entry.allFiles))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
}

export function resolveAudioterapiaFile(
  locale: LanguageCode,
  mediaFileName?: string | null
): { relative: string; locale: LanguageCode } | null {
  if (mediaFileName?.trim()) {
    const trimmed = mediaFileName.trim().replace(/\\/g, '/')

    if (fileExists(trimmed)) {
      return { relative: trimmed, locale }
    }

    const byBasename = findMediaByBasename(trimmed)
    if (byBasename && fileExists(byBasename)) {
      return { relative: byBasename, locale }
    }

    for (const relative of audioterapiaCandidates(locale, trimmed)) {
      if (fileExists(relative)) {
        return { relative: toPosixRelative(relative), locale }
      }
    }

    return null
  }

  const candidates = libraryLocaleCandidates(locale)

  for (const rootDir of getAudioterapiaBaseDirs()) {
    const mp3 = findFirstExisting(candidates, (loc) =>
      relativePath(rootDir, `${loc}.mp3`)
    )
    if (mp3) {
      return { relative: toPosixRelative(mp3.relative), locale: mp3.locale }
    }

    const mp4 = findFirstExisting(candidates, (loc) =>
      relativePath(rootDir, `${loc}.mp4`)
    )
    if (mp4) {
      return { relative: toPosixRelative(mp4.relative), locale: mp4.locale }
    }
  }

  return null
}

export function resolveLivroDigitalFile(
  locale: LanguageCode
): { relative: string; locale: LanguageCode } | null {
  const candidates = libraryLocaleCandidates(locale)

  const found = findFirstExisting(candidates, (loc) =>
    relativePath('livro-digital', `${loc}.pdf`)
  )
  if (found) return { relative: found.relative, locale: found.locale }

  const legacy = findLegacyLocalizedFile(
    candidates,
    ['livro-digital', 'livro digital'],
    '.pdf'
  )
  return legacy ? { relative: legacy.relative, locale: legacy.locale } : null
}

export type ResolvedPdfVariant = {
  relative: string
  locale: LanguageCode
  label: string
}

export function resolvePdfVariants(locale: LanguageCode): ResolvedPdfVariant[] {
  const candidates = libraryLocaleCandidates(locale)

  for (const loc of candidates) {
    const variants: ResolvedPdfVariant[] = []

    for (let i = 0; i < PDF_VARIANT_FILES.length; i++) {
      const fileName = PDF_VARIANT_FILES[i]
      const relative = relativePath('pdf', loc, fileName)
      if (!fileExists(relative)) {
        variants.length = 0
        break
      }
      const labels = PDF_VARIANT_LABELS[loc] ?? PDF_VARIANT_LABELS['pt-BR']
      variants.push({
        relative,
        locale: loc,
        label: labels[i]
      })
    }

    if (variants.length === PDF_VARIANT_FILES.length) {
      return variants
    }
  }

  const legacy = findLegacyLocalizedFile(candidates, ['pdfs', 'pdf'], '.pdf')
  if (legacy) {
    const labels = PDF_VARIANT_LABELS[legacy.locale] ?? PDF_VARIANT_LABELS['pt-BR']
    return [
      {
        relative: legacy.relative,
        locale: legacy.locale,
        label: labels[0]
      }
    ]
  }

  return []
}

export function toPublicUrl(relative: string, baseUrl?: string): string {
  const publicPath = `/biblioteca/${relative
    .split(/[/\\]/)
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
  if (!baseUrl) return publicPath
  return `${baseUrl.replace(/\/$/, '')}${publicPath}`
}

export function getAbsolutePath(relative: string): string {
  return path.join(bibliotecaRoot(), relative)
}

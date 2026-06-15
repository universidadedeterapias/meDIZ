import type { LanguageCode } from '@/i18n/config'
import { filterMediaItemsForUserLanguage } from '@/lib/catalog/locale'
import type { CatalogMediaItem, CourseMediaKind } from '@/lib/catalog/types'

export function inferMediaKind(
  item: CatalogMediaItem
): CourseMediaKind | 'audio' {
  if (item.kind === 'video' || item.kind === 'pdf' || item.kind === 'audio') {
    return item.kind
  }
  const ref = item.mediaFileName.toLowerCase()
  if (ref.endsWith('.pdf')) return 'pdf'
  if (ref.endsWith('.mp4') || ref.endsWith('.webm')) return 'video'
  if (ref.endsWith('.mp3')) return 'audio'
  return 'audio'
}

export function pickCourseMedia(
  items: CatalogMediaItem[] | null | undefined,
  language: LanguageCode,
  kind: CourseMediaKind,
  fallbackMediaFileName?: string | null
): CatalogMediaItem | null {
  if (items?.length) {
    const localized = filterMediaItemsForUserLanguage(items, language)
    const fromLocalized = localized.find((i) => inferMediaKind(i) === kind)
    if (fromLocalized) return fromLocalized

    const fromAll = items.find((i) => inferMediaKind(i) === kind)
    if (fromAll) return fromAll
  }

  if (kind === 'video' && fallbackMediaFileName?.trim()) {
    return {
      id: 'primary-video',
      title: 'Vídeo',
      mediaFileName: fallbackMediaFileName.trim(),
      sortOrder: 0,
      kind: 'video'
    }
  }

  return null
}

export function listCourseMaterials(
  items: CatalogMediaItem[] | null | undefined,
  language: LanguageCode,
  fallbackMediaFileName?: string | null
): { video: CatalogMediaItem | null; pdf: CatalogMediaItem | null } {
  return {
    video: pickCourseMedia(items, language, 'video', fallbackMediaFileName),
    pdf: pickCourseMedia(items, language, 'pdf', null)
  }
}

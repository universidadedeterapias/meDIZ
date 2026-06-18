import type { CatalogModuleMediaKind, CatalogProduct } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  CatalogMediaItem,
  CatalogProductOffer,
  CourseMediaKind
} from '@/lib/catalog/types'
import { parseMediaItems } from '@/lib/catalog/media-items'

export type CourseModuleMediaInput = {
  id?: string
  kind: CourseMediaKind
  title: string
  mediaFileName: string
  locale?: 'pt' | 'en' | 'es' | null
  sortOrder: number
}

export type CourseModuleInput = {
  id?: string
  title: string
  description?: string | null
  coverImageUrl?: string | null
  sortOrder: number
  media: CourseModuleMediaInput[]
}

export type CourseModuleDto = {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  sortOrder: number
  media: Array<{
    id: string
    kind: CourseMediaKind
    title: string
    mediaFileName: string
    locale: 'pt' | 'en' | 'es' | null
    sortOrder: number
  }>
}

export type CourseModulePlaybackItem = {
  id: string
  url: string
  title: string
}

export type CourseModulePlaybackMedia = {
  videos: CourseModulePlaybackItem[]
  pdfs: CourseModulePlaybackItem[]
  audios: CourseModulePlaybackItem[]
}

export type CourseModulePlayback = {
  id: string
  title: string
  description: string | null
  coverImageUrl: string | null
  sortOrder: number
  media: CourseModulePlaybackMedia
}

function kindToPrisma(kind: CourseMediaKind): CatalogModuleMediaKind {
  return kind.toUpperCase() as CatalogModuleMediaKind
}

function kindFromPrisma(kind: CatalogModuleMediaKind): CourseMediaKind {
  return kind.toLowerCase() as CourseMediaKind
}

function parseModuleLocale(
  locale: string | null | undefined
): 'pt' | 'en' | 'es' | null {
  if (locale === 'pt' || locale === 'en' || locale === 'es') return locale
  return null
}

function mediaMatchesLanguage(
  locale: 'pt' | 'en' | 'es' | null,
  language: 'pt' | 'en' | 'es'
): boolean {
  return locale === null || locale === language
}

export function serializeCourseModule(
  row: {
    id: string
    title: string
    description: string | null
    coverImageUrl: string | null
    sortOrder: number
    media: Array<{
      id: string
      kind: CatalogModuleMediaKind
      title: string
      mediaFileName: string
      locale: string | null
      sortOrder: number
    }>
  }
): CourseModuleDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    sortOrder: row.sortOrder,
    media: row.media
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        id: m.id,
        kind: kindFromPrisma(m.kind),
        title: m.title,
        mediaFileName: m.mediaFileName,
        locale: parseModuleLocale(m.locale),
        sortOrder: m.sortOrder
      }))
  }
}

export async function listCourseModules(
  catalogProductId: string
): Promise<CourseModuleDto[]> {
  const rows = await prisma.catalogCourseModule.findMany({
    where: { catalogProductId },
    orderBy: { sortOrder: 'asc' },
    include: {
      media: { orderBy: { sortOrder: 'asc' } }
    }
  })
  return rows.map(serializeCourseModule)
}

async function migrateLegacyMediaItemsToModules(
  product: CatalogProduct
): Promise<void> {
  const count = await prisma.catalogCourseModule.count({
    where: { catalogProductId: product.id }
  })
  if (count > 0) return

  const items = parseMediaItems(product.mediaItems) ?? []
  const legacyVideo =
    product.mediaFileName?.trim() &&
    !items.some((i) => i.kind === 'video')
      ? product.mediaFileName.trim()
      : null

  if (items.length === 0 && !legacyVideo) return

  const mediaRows: Array<{
    kind: CatalogModuleMediaKind
    title: string
    mediaFileName: string
    locale: string | null
    sortOrder: number
  }> = []

  let order = 0
  for (const item of items) {
    mediaRows.push({
      kind: kindToPrisma(item.kind),
      title: item.title?.trim() || defaultTitleForKind(item.kind),
      mediaFileName: item.mediaFileName,
      locale: item.locale ?? null,
      sortOrder: order++
    })
  }

  if (legacyVideo) {
    mediaRows.push({
      kind: 'VIDEO',
      title: 'Vídeo',
      mediaFileName: legacyVideo,
      locale: product.locale,
      sortOrder: order++
    })
  }

  await prisma.catalogCourseModule.create({
    data: {
      catalogProductId: product.id,
      title: 'Módulo 1',
      sortOrder: 0,
      media: { create: mediaRows }
    }
  })
}

function defaultTitleForKind(kind: CourseMediaKind): string {
  switch (kind) {
    case 'video':
      return 'Vídeo'
    case 'pdf':
      return 'Material PDF'
    case 'audio':
      return 'Áudio'
  }
}

export async function ensureCourseModulesMigrated(
  product: CatalogProduct
): Promise<CourseModuleDto[]> {
  if (product.permissionKey !== 'VIDEO') return []
  await migrateLegacyMediaItemsToModules(product)
  return listCourseModules(product.id)
}

export async function replaceCourseModules(
  catalogProductId: string,
  modules: CourseModuleInput[]
): Promise<CourseModuleDto[]> {
  await prisma.$transaction(async (tx) => {
    await tx.catalogCourseModule.deleteMany({ where: { catalogProductId } })

    for (const mod of modules) {
      await tx.catalogCourseModule.create({
        data: {
          catalogProductId,
          title: mod.title.trim(),
          description: mod.description?.trim() || null,
          coverImageUrl: mod.coverImageUrl?.trim() || null,
          sortOrder: mod.sortOrder,
          media: {
            create: mod.media.map((m, idx) => ({
              kind: kindToPrisma(m.kind),
              title: m.title.trim() || defaultTitleForKind(m.kind),
              mediaFileName: m.mediaFileName.trim(),
              locale: m.locale ?? null,
              sortOrder: m.sortOrder ?? idx
            }))
          }
        }
      })
    }
  })

  return listCourseModules(catalogProductId)
}

export function buildCourseModulePlayback(
  modules: CourseModuleDto[],
  language: 'pt' | 'en' | 'es',
  resolveUrl: (mediaFileName: string, kind: CourseMediaKind) => string | null
): CourseModulePlayback[] {
  return modules.map((mod) => {
    const listByKind = (kind: CourseMediaKind): CourseModulePlaybackItem[] => {
      return mod.media
        .filter((m) => m.kind === kind)
        .filter((m) => mediaMatchesLanguage(m.locale, language))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((match) => {
          const url = resolveUrl(match.mediaFileName.trim(), kind)
          if (!url) return null
          return { id: match.id, url, title: match.title }
        })
        .filter((item): item is CourseModulePlaybackItem => item !== null)
    }

    return {
      id: mod.id,
      title: mod.title,
      description: mod.description,
      coverImageUrl: mod.coverImageUrl,
      sortOrder: mod.sortOrder,
      media: {
        videos: listByKind('video'),
        pdfs: listByKind('pdf'),
        audios: listByKind('audio')
      }
    }
  })
}

export function firstModuleVideo(
  playback: CourseModulePlayback[]
): { url: string; title: string } | null {
  for (const mod of playback) {
    const first = mod.media.videos[0]
    if (first) return first
  }
  return null
}

export function firstModulePdf(
  playback: CourseModulePlayback[]
): { url: string; title: string } | null {
  for (const mod of playback) {
    const first = mod.media.pdfs[0]
    if (first) return first
  }
  return null
}

export function legacyItemsFromProduct(product: CatalogProduct): CatalogMediaItem[] {
  return parseMediaItems(product.mediaItems) ?? []
}

export type CourseMediaKinds = {
  hasVideo: boolean
  hasPdf: boolean
  hasAudio: boolean
}

const EMPTY_COURSE_MEDIA_KINDS: CourseMediaKinds = {
  hasVideo: false,
  hasPdf: false,
  hasAudio: false
}

function mergeCourseMediaKind(
  current: CourseMediaKinds,
  kind: CatalogModuleMediaKind | CourseMediaKind
): CourseMediaKinds {
  const normalized = String(kind).toUpperCase()
  return {
    hasVideo: current.hasVideo || normalized === 'VIDEO',
    hasPdf: current.hasPdf || normalized === 'PDF',
    hasAudio: current.hasAudio || normalized === 'AUDIO'
  }
}

export function formatCourseMediaTagLabel(kinds: CourseMediaKinds): string {
  const parts: string[] = []
  if (kinds.hasVideo) parts.push('Vídeo')
  if (kinds.hasPdf) parts.push('PDF')
  if (kinds.hasAudio) parts.push('Áudio')
  if (parts.length === 0) return 'Curso'
  if (parts.length === 1) return parts[0]!
  if (parts.length === 2) return `${parts[0]} e ${parts[1]}`
  return `${parts[0]}, ${parts[1]} e ${parts[2]}`
}

export async function getCourseMediaKindsByProductIds(
  productIds: string[]
): Promise<Map<string, CourseMediaKinds>> {
  const result = new Map<string, CourseMediaKinds>()
  if (productIds.length === 0) return result

  const moduleRows = await prisma.catalogCourseModule.findMany({
    where: { catalogProductId: { in: productIds } },
    select: {
      catalogProductId: true,
      media: { select: { kind: true } }
    }
  })

  for (const row of moduleRows) {
    let kinds = result.get(row.catalogProductId) ?? { ...EMPTY_COURSE_MEDIA_KINDS }
    for (const media of row.media) {
      kinds = mergeCourseMediaKind(kinds, media.kind)
    }
    result.set(row.catalogProductId, kinds)
  }

  const missingIds = productIds.filter((id) => {
    const kinds = result.get(id)
    return !kinds || (!kinds.hasVideo && !kinds.hasPdf && !kinds.hasAudio)
  })

  if (missingIds.length > 0) {
    const legacyProducts = await prisma.catalogProduct.findMany({
      where: { id: { in: missingIds }, permissionKey: 'VIDEO' },
      select: { id: true, mediaItems: true, mediaFileName: true }
    })

    for (const product of legacyProducts) {
      let kinds = { ...EMPTY_COURSE_MEDIA_KINDS }
      for (const item of parseMediaItems(product.mediaItems) ?? []) {
        if (item.kind) kinds = mergeCourseMediaKind(kinds, item.kind)
      }
      if (product.mediaFileName?.trim()) {
        kinds = mergeCourseMediaKind(kinds, 'VIDEO')
      }
      result.set(product.id, kinds)
    }
  }

  return result
}

export async function enrichVideoCourseOffers(
  offers: CatalogProductOffer[]
): Promise<CatalogProductOffer[]> {
  const videoIds = offers
    .filter((offer) => offer.permissionKey === 'VIDEO')
    .map((offer) => offer.id)

  if (videoIds.length === 0) return offers

  const kindsMap = await getCourseMediaKindsByProductIds(videoIds)

  return offers.map((offer) => {
    if (offer.permissionKey !== 'VIDEO') return offer
    const kinds = kindsMap.get(offer.id)
    if (!kinds) return offer
    return {
      ...offer,
      tagLabel: formatCourseMediaTagLabel(kinds)
    }
  })
}

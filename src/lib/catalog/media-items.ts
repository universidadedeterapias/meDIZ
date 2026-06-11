import type { Prisma } from '@prisma/client'
import { catalogLocaleLabel, normalizeCatalogLocale } from '@/lib/catalog/locale'
import type { CatalogMediaItem } from './types'

export function parseMediaItems(value: unknown): CatalogMediaItem[] | null {
  if (!value || !Array.isArray(value)) return null

  const items: CatalogMediaItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const mediaFileName = String(row.mediaFileName ?? '').trim()
    const title = String(row.title ?? '').trim()
    if (!mediaFileName || !title) continue

    items.push({
      id: String(row.id ?? `track-${items.length}`),
      title,
      mediaFileName,
      locale: row.locale ? String(row.locale) : undefined,
      sortOrder:
        typeof row.sortOrder === 'number'
          ? row.sortOrder
          : Number.parseInt(String(row.sortOrder ?? items.length), 10) || items.length
    })
  }

  return items.length > 0 ? items.sort((a, b) => a.sortOrder - b.sortOrder) : null
}

/** Payload vindo do body Zod (campos podem ser opcionais na inferência). */
export type CatalogMediaItemPayload = {
  id?: string
  title?: string
  mediaFileName?: string
  locale?: string
  sortOrder?: number
}

export function mediaItemsToJson(
  items: CatalogMediaItemPayload[] | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (!items?.length) return undefined

  const normalized: CatalogMediaItem[] = []
  for (const [index, item] of items.entries()) {
    const mediaFileName = item.mediaFileName?.trim()
    const title = item.title?.trim()
    if (!mediaFileName || !title) continue

    normalized.push({
      id: item.id?.trim() || `track-${normalized.length}`,
      title,
      mediaFileName,
      locale: item.locale?.trim() || undefined,
      sortOrder:
        typeof item.sortOrder === 'number'
          ? item.sortOrder
          : Number.parseInt(String(item.sortOrder ?? index), 10) || index
    })
  }

  if (normalized.length === 0) return undefined
  return normalized as unknown as Prisma.InputJsonValue
}

function mediaItemLocaleKey(locale?: string): string {
  const normalized = normalizeCatalogLocale(locale)
  if (normalized) return normalized
  if (locale === 'pt-BR' || locale === 'pt-PT') return 'pt'
  return locale ?? 'pt'
}

export function localeDisplayLabel(locale?: string): string {
  const normalized = normalizeCatalogLocale(locale)
  if (normalized) return catalogLocaleLabel(normalized)
  switch (locale) {
    case 'pt-BR':
    case 'pt-PT':
      return 'Português'
    case 'es':
      return 'Español'
    case 'en':
      return 'Inglês'
    default:
      return locale ?? 'Conteúdo'
  }
}

export function groupMediaItemsByLocale(
  items: CatalogMediaItem[]
): { locale: string; label: string; tracks: CatalogMediaItem[] }[] {
  const map = new Map<string, CatalogMediaItem[]>()

  for (const item of items) {
    const key = mediaItemLocaleKey(item.locale)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }

  const order = ['pt', 'en', 'es']
  return [...map.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([locale, tracks]) => ({
      locale,
      label: localeDisplayLabel(locale),
      tracks: tracks.sort((a, b) => a.sortOrder - b.sortOrder)
    }))
}

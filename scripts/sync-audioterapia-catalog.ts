/**
 * Sincroniza produtos de audioterapia (todas as faixas/idiomas por pasta).
 * Uso: npx tsx scripts/sync-audioterapia-catalog.ts
 */
import { listAudioterapiaCatalogEntries } from '../src/lib/library/contentPaths'
import { mediaItemsToJson } from '../src/lib/catalog/media-items'
import { prisma } from '../src/lib/prisma'

function themeFolderKey(mediaFileName: string): string {
  const parts = mediaFileName.replace(/\\/g, '/').split('/')
  const folder = parts.length >= 2 ? parts[1] : parts[0]
  return folder
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function productThemeKey(title: string, mediaFileName?: string | null): string {
  if (mediaFileName?.trim()) return themeFolderKey(mediaFileName)
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

async function main() {
  const entries = listAudioterapiaCatalogEntries()
  console.log(`Temas: ${entries.length}\n`)
  for (const e of entries) {
    console.log(`${e.title} — ${e.mediaItems.length} faixa(s)`)
    for (const t of e.mediaItems) {
      console.log(`  [${t.locale ?? '?'}] ${t.title}`)
    }
  }

  const existing = await prisma.catalogProduct.findMany({
    where: { section: 'AUDIOTERAPIA' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  })

  const defaultPurchaseUrl =
    process.env.NEXT_PUBLIC_HOTMART_AUDIOTERAPIA_URL ||
    'https://pay.hotmart.com/'

  let maxSort = existing.reduce((m, p) => Math.max(m, p.sortOrder), -1) + 1
  const unassigned = existing.filter((p) => !p.mediaFileName?.trim())
  const matched = new Set<string>()
  let created = 0
  let updated = 0

  for (const entry of entries) {
    const data = {
      title: entry.title,
      mediaFileName: entry.mediaFileName,
      mediaItems: mediaItemsToJson(entry.mediaItems)
    }

    const match = existing.find(
      (p) =>
        !matched.has(p.id) &&
        (productThemeKey(p.title, p.mediaFileName) === entry.themeKey ||
          p.title.trim().toLowerCase() === entry.title.trim().toLowerCase())
    )

    if (match) {
      await prisma.catalogProduct.update({ where: { id: match.id }, data })
      matched.add(match.id)
      updated++
    } else if (unassigned.length > 0) {
      const p = unassigned.shift()!
      await prisma.catalogProduct.update({ where: { id: p.id }, data })
      matched.add(p.id)
      updated++
    } else {
      await prisma.catalogProduct.create({
        data: {
          section: 'AUDIOTERAPIA',
          title: entry.title,
          tagLabel: 'Áudios guiados',
          coverImageUrl: '/catalog/placeholder.svg',
          purchaseUrl: defaultPurchaseUrl,
          permissionKey: 'AUDIOTERAPIA',
          pdfIndex: 0,
          mediaFileName: entry.mediaFileName,
          mediaItems: data.mediaItems,
          unlockedLabel: 'Ouvir agora',
          sortOrder: maxSort++,
          active: true
        }
      })
      created++
    }
  }

  console.log('\n', { created, updated })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

/**
 * Atualiza faixas no banco e remove duplicados de audioterapia.
 * Uso: npx tsx scripts/reconcile-audioterapia-catalog.ts
 */
import { listAudioterapiaCatalogEntries } from '../src/lib/library/contentPaths'
import { mediaItemsToJson } from '../src/lib/catalog/media-items'
import { prisma } from '../src/lib/prisma'

function themeKey(title: string, media?: string | null): string {
  if (media?.trim()) {
    const parts = media.replace(/\\/g, '/').split('/')
    const folder = parts.length >= 2 ? parts[1] : parts[0]
    return folder
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

async function main() {
  const entries = listAudioterapiaCatalogEntries()
  const all = await prisma.catalogProduct.findMany({
    where: { section: 'AUDIOTERAPIA' },
    orderBy: { sortOrder: 'asc' }
  })

  const usedIds = new Set<string>()

  for (const entry of entries) {
    const matches = all.filter(
      (p) =>
        !usedIds.has(p.id) &&
        (themeKey(p.title, p.mediaFileName) === entry.themeKey ||
          p.title.trim().toLowerCase() === entry.title.trim().toLowerCase())
    )

    const keep =
      matches.find((p) => p.mediaFileName?.includes('audioterapias')) ??
      matches[0]

    if (!keep) continue

    await prisma.catalogProduct.update({
      where: { id: keep.id },
      data: {
        title: entry.title,
        mediaFileName: entry.mediaFileName,
        mediaItems: mediaItemsToJson(entry.mediaItems)
      }
    })
    usedIds.add(keep.id)
    console.log(`✓ ${entry.title}: ${entry.mediaItems.length} faixa(s)`)

    for (const dup of matches.filter((p) => p.id !== keep.id)) {
      await prisma.catalogProduct.delete({ where: { id: dup.id } })
      console.log(`  removido duplicado: ${dup.title}`)
    }
  }

  for (const orphan of all.filter((p) => !usedIds.has(p.id))) {
    try {
      await prisma.catalogProduct.delete({ where: { id: orphan.id } })
      console.log(`  removido órfão: ${orphan.title}`)
    } catch {
      // já removido
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

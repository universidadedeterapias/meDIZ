/**
 * Sincroniza produtos AUDIOTERAPIA a partir de public/biblioteca/audioterapias/
 * Uso: npx tsx scripts/sync-audioterapia-from-disk.ts
 */
import { prisma } from '../src/lib/prisma'
import { mediaItemsToJson } from '../src/lib/catalog/media-items'
import { listAudioterapiaCatalogEntries } from '../src/lib/library/contentPaths'

async function main() {
  const entries = listAudioterapiaCatalogEntries()
  console.log(`Pastas encontradas no disco: ${entries.length}`)

  if (entries.length === 0) {
    console.log(
      'Nenhuma pasta em public/biblioteca/audioterapias/ com MP3 ou MP4.'
    )
    return
  }

  const existing = await prisma.catalogProduct.findMany({
    where: { section: 'AUDIOTERAPIA' },
    select: { id: true, title: true, mediaFileName: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  })

  const defaultPurchaseUrl =
    process.env.NEXT_PUBLIC_HOTMART_AUDIOTERAPIA_URL ||
    process.env.NEXT_PUBLIC_HOTMART_SALES_URL ||
    'https://pay.hotmart.com/'

  let created = 0
  let updated = 0
  let maxSort =
    existing.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1

  const matchedIds = new Set<string>()

  for (const entry of entries) {
    const data = {
      title: entry.title,
      mediaFileName: entry.mediaFileName,
      mediaItems: mediaItemsToJson(entry.mediaItems)
    }

    const match = existing.find(
      (p) =>
        !matchedIds.has(p.id) &&
        p.title.trim().toLowerCase() === entry.title.trim().toLowerCase()
    )

    if (match) {
      await prisma.catalogProduct.update({ where: { id: match.id }, data })
      matchedIds.add(match.id)
      updated++
      console.log(`  ✓ ${entry.title} (${entry.mediaItems.length} faixas)`)
      continue
    }

    await prisma.catalogProduct.create({
      data: {
        section: 'AUDIOTERAPIA',
        title: entry.title,
        description: null,
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
    console.log(`  + ${entry.title} (${entry.mediaItems.length} faixas)`)
  }

  console.log(`\nCriados: ${created}, atualizados: ${updated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

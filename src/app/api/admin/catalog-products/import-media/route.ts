import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mediaItemsToJson } from '@/lib/catalog/media-items'
import { requireAdmin } from '@/lib/requireAuth'
import { listAudioterapiaCatalogEntries } from '@/lib/library/contentPaths'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const entries = listAudioterapiaCatalogEntries()
    return NextResponse.json({
      files: entries.flatMap((entry) => entry.allFiles),
      entries: entries.map((e) => ({
        title: e.title,
        themeKey: e.themeKey,
        tracks: e.mediaItems.length,
        mediaFileName: e.mediaFileName
      }))
    })
  } catch (error) {
    console.error('[admin/catalog-products/import-media] GET:', error)
    return NextResponse.json(
      { error: 'Erro ao listar arquivos da pasta audioterapias', files: [] },
      { status: 500 }
    )
  }
}

/** Sincroniza produtos: 1 card por pasta de tema, com todas as faixas/idiomas em mediaItems. */
export async function POST() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const entries = listAudioterapiaCatalogEntries()
    if (entries.length === 0) {
      return NextResponse.json(
        {
          error:
            'Nenhum arquivo em public/biblioteca/audioterapias/. Use uma subpasta por tema com MP3 ou MP4 dentro.'
        },
        { status: 400 }
      )
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

    const unassignedProducts = existing.filter((p) => !p.mediaFileName?.trim())
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
          (productThemeKey(p.title, p.mediaFileName) === entry.themeKey ||
            p.title.trim().toLowerCase() === entry.title.trim().toLowerCase())
      )

      if (match) {
        await prisma.catalogProduct.update({
          where: { id: match.id },
          data
        })
        matchedIds.add(match.id)
        updated++
        continue
      }

      if (unassignedProducts.length > 0) {
        const product = unassignedProducts.shift()!
        await prisma.catalogProduct.update({
          where: { id: product.id },
          data
        })
        matchedIds.add(product.id)
        updated++
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
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
      tracks: entries.reduce((n, e) => n + e.mediaItems.length, 0),
      entries: entries.map((entry) => ({
        title: entry.title,
        tracks: entry.mediaItems.length,
        mediaFileName: entry.mediaFileName
      }))
    })
  } catch (error) {
    console.error('[admin/catalog-products/import-media] POST:', error)
    const message =
      error instanceof Error &&
      (error.message.includes('media_items') ||
        error.message.includes('media_file_name') ||
        error.message.includes('catalog_products'))
        ? 'Banco desatualizado. Execute: npx prisma migrate deploy && npx prisma generate'
        : 'Erro ao importar audioterapias da pasta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mediaItemsToJson, parseMediaItems } from '@/lib/catalog/media-items'
import type { CatalogMediaItem } from '@/lib/catalog/types'
import {
  ensureAudioterapiaFolderName,
  uploadAudioterapiaPackageFiles
} from '@/lib/catalog/audioterapia-folder'
import { saveCatalogMediaFile } from '@/lib/catalog/media-upload'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const formData = await req.formData()
    const title = String(formData.get('title') ?? '').trim()
    const productId = String(formData.get('productId') ?? '').trim() || null
    const description = String(formData.get('description') ?? '').trim() || null
    const purchaseUrl = String(formData.get('purchaseUrl') ?? '').trim()
    const replaceExisting = formData.get('replaceExisting') === 'true'

    if (!title) {
      return NextResponse.json({ error: 'Informe o título da audioterapia' }, { status: 400 })
    }

    const uploads: { name: string; buffer: Buffer }[] = []
    for (const entry of formData.getAll('files')) {
      if (typeof entry === 'string' || !(entry instanceof File) || entry.size === 0) {
        continue
      }
      const buffer = Buffer.from(await entry.arrayBuffer())
      uploads.push({ name: entry.name, buffer })
    }

    if (uploads.length === 0) {
      return NextResponse.json(
        { error: 'Envie ao menos um arquivo MP3 ou MP4' },
        { status: 400 }
      )
    }

    const cover = formData.get('cover')
    let coverImageUrl: string | null = null
    if (cover instanceof File && cover.size > 0) {
      const buffer = Buffer.from(await cover.arrayBuffer())
      const uploaded = await saveCatalogMediaFile(buffer, cover.name, 'cover')
      coverImageUrl = uploaded.publicUrl
    }

    const { folderName, mediaItems, primaryMediaFileName } =
      await uploadAudioterapiaPackageFiles(title, uploads)

    const defaultPurchaseUrl =
      purchaseUrl ||
      process.env.NEXT_PUBLIC_HOTMART_AUDIOTERAPIA_URL ||
      process.env.NEXT_PUBLIC_HOTMART_SALES_URL ||
      'https://pay.hotmart.com/'

    const displayTitle = ensureAudioterapiaFolderName(title)
      .replace(/^Audioterapia\s+/i, '')
      .trim()

    const dataPayload = {
      section: 'AUDIOTERAPIA' as const,
      title: displayTitle || title,
      description,
      tagLabel: 'Áudios guiados',
      purchaseUrl: defaultPurchaseUrl,
      permissionKey: 'AUDIOTERAPIA' as const,
      mediaFileName: primaryMediaFileName,
      mediaItems: mediaItemsToJson(mediaItems),
      unlockedLabel: 'Ouvir agora',
      active: true,
      ...(coverImageUrl ? { coverImageUrl } : {})
    }

    let product

    if (productId) {
      const existing = await prisma.catalogProduct.findUnique({
        where: { id: productId }
      })
      if (!existing || existing.section !== 'AUDIOTERAPIA') {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      }

      product = await prisma.catalogProduct.update({
        where: { id: productId },
        data: {
          ...dataPayload,
          mediaItems: replaceExisting
            ? dataPayload.mediaItems
            : mergeMediaItems(existing.mediaItems, mediaItems)
        }
      })
    } else {
      const maxSort = await prisma.catalogProduct.aggregate({
        where: { section: 'AUDIOTERAPIA' },
        _max: { sortOrder: true }
      })

      product = await prisma.catalogProduct.create({
        data: {
          ...dataPayload,
          pdfIndex: 0,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1
        }
      })
    }

    return NextResponse.json({
      ok: true,
      productId: product.id,
      folderName,
      tracks: mediaItems.length,
      title: product.title
    })
  } catch (error) {
    console.error('[upload-audioterapia-package]', error)
    return NextResponse.json(
      { error: formatCatalogDbError(error) },
      { status: 500 }
    )
  }
}

function mergeMediaItems(
  existingJson: unknown,
  incoming: CatalogMediaItem[]
) {
  const current = parseMediaItems(existingJson) ?? []
  const merged = [...current, ...incoming].map((item, index) => ({
    ...item,
    id: `track-${index}`,
    sortOrder: index
  }))
  return mediaItemsToJson(merged)
}

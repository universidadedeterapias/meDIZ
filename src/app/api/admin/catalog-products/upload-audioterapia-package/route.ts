import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { mediaItemsToJson, parseMediaItems } from '@/lib/catalog/media-items'
import type { CatalogMediaItem } from '@/lib/catalog/types'
import {
  buildAudioterapiaPackageFromUploads,
  ensureAudioterapiaFolderName
} from '@/lib/catalog/audioterapia-folder'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  title: z.string().min(1),
  productId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  purchaseUrl: z.string().optional(),
  replaceExisting: z.boolean().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  locale: z.enum(['pt', 'en', 'es']).optional().nullable(),
  tracks: z
    .array(
      z.object({
        url: z.string().url(),
        originalName: z.string().min(1)
      })
    )
    .min(1)
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const parsed = bodySchema.parse(await req.json())
    const title = parsed.title.trim()
    const productId = parsed.productId?.trim() || null
    const description = parsed.description?.trim() || null
    const purchaseUrl = parsed.purchaseUrl?.trim() ?? ''
    const replaceExisting = parsed.replaceExisting ?? true
    const coverImageUrl = parsed.coverImageUrl?.trim() || null

    const tracks = parsed.tracks.map((track) => ({
      url: track.url,
      originalName: track.originalName
    }))

    const { folderName, mediaItems, primaryMediaFileName } =
      buildAudioterapiaPackageFromUploads(title, tracks, parsed.locale)

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
      locale: parsed.locale ?? null,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 })
    }
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

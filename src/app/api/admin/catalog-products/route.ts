import { NextRequest, NextResponse } from 'next/server'
import type { CatalogSection } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  listCatalogProducts,
  serializeProduct
} from '@/lib/catalog/products'
import { mediaItemsToJson } from '@/lib/catalog/media-items'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import { catalogProductBodySchema } from '@/lib/catalog/schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const sectionParam = request.nextUrl.searchParams.get('section')
    const section =
      sectionParam?.toUpperCase() === 'AUDIOTERAPIA'
        ? 'AUDIOTERAPIA'
        : sectionParam?.toUpperCase() === 'BIBLIOTECA'
          ? 'BIBLIOTECA'
          : undefined

    if (section) {
      const products = await listCatalogProducts({ section, activeOnly: false })
      return NextResponse.json({ products })
    }

    const products = await listCatalogProducts({
      section: 'BIBLIOTECA',
      activeOnly: false
    })
    const audio = await listCatalogProducts({
      section: 'AUDIOTERAPIA',
      activeOnly: false
    })

    return NextResponse.json({ products: [...products, ...audio] })
  } catch (error) {
    console.error('[admin/catalog-products] GET:', error)
    const detail = error instanceof Error ? error.message : ''
    const message =
      detail.includes('media_items') ||
      detail.includes('media_file_name') ||
      detail.includes('catalog_products')
        ? 'Banco desatualizado. Execute: npx prisma migrate deploy && npx prisma generate'
        : detail
          ? `Erro ao carregar produtos: ${detail}`
          : 'Erro ao carregar produtos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const json = await request.json()
    const parsed = catalogProductBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const row = await prisma.catalogProduct.create({
      data: {
        section: data.section as CatalogSection,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        tagLabel: data.tagLabel?.trim() || null,
        coverImageUrl: data.coverImageUrl?.trim() || null,
        purchaseUrl: data.purchaseUrl.trim(),
        permissionKey: data.permissionKey,
        pdfIndex: data.pdfIndex,
        mediaFileName: data.mediaFileName?.trim() || null,
        mediaItems: mediaItemsToJson(data.mediaItems ?? null),
        unlockedLabel: data.unlockedLabel?.trim() || null,
        sortOrder: data.sortOrder,
        active: data.active
      }
    })

    return NextResponse.json({ product: serializeProduct(row) }, { status: 201 })
  } catch (error) {
    console.error('[admin/catalog-products] POST:', error)
    return NextResponse.json(
      { error: formatCatalogDbError(error) },
      { status: 500 }
    )
  }
}

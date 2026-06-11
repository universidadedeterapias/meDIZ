import { NextRequest, NextResponse } from 'next/server'
import type { CatalogSection } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { serializeProduct } from '@/lib/catalog/products'
import { mediaItemsToJson } from '@/lib/catalog/media-items'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import { catalogProductBodySchema } from '@/lib/catalog/schemas'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

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
    const row = await prisma.catalogProduct.update({
      where: { id },
      data: {
        section: data.section as CatalogSection,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        tagLabel: data.tagLabel?.trim() || null,
        coverImageUrl: data.coverImageUrl?.trim() || null,
        purchaseUrl: data.purchaseUrl.trim(),
        permissionKey: data.permissionKey,
        locale: data.locale ?? null,
        pdfIndex: data.pdfIndex,
        mediaFileName: data.mediaFileName?.trim() || null,
        mediaItems: mediaItemsToJson(data.mediaItems ?? null),
        unlockedLabel: data.unlockedLabel?.trim() || null,
        freeAccess: data.freeAccess,
        sortOrder: data.sortOrder,
        active: data.active
      }
    })

    return NextResponse.json({ product: serializeProduct(row) })
  } catch (error) {
    console.error('[admin/catalog-products] PATCH:', error)
    const message = formatCatalogDbError(error)
    const status = message === 'Produto não encontrado' ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  try {
    await prisma.catalogProduct.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }
}

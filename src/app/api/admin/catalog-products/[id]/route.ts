import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { serializeProduct } from '@/lib/catalog/products'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
import { findCatalogProductIdConflict } from '@/lib/catalog/catalog-product-id-conflict'
import { catalogProductBodySchema } from '@/lib/catalog/schemas'
import { catalogProductWriteData } from '@/lib/purchases/catalog-product-write'
import {
  loadGrantsProductIds,
  syncCatalogProductGrants
} from '@/lib/purchases/catalog-grants'
import {
  loadExtraHotmartProductIds,
  syncCatalogProductExternalIds
} from '@/lib/purchases/catalog-external-ids'

async function serializeAdminProduct(row: {
  id: string
  section: import('@prisma/client').CatalogSection
  title: string
  description: string | null
  tagLabel: string | null
  coverImageUrl: string | null
  purchaseUrl: string
  permissionKey: import('@prisma/client').CatalogPermissionKey
  locale: string | null
  pdfIndex: number
  mediaFileName: string | null
  mediaItems: unknown
  stoneProductId: string | null
  hotmartProductId: string | null
  paymentProvider: import('@prisma/client').PaymentProvider
  unlockedLabel: string | null
  freeAccess: boolean
  sortOrder: number
  active: boolean
}) {
  const [grantsProductIds, extraHotmartProductIds] = await Promise.all([
    loadGrantsProductIds(row.id),
    loadExtraHotmartProductIds(row.id)
  ])
  return serializeProduct({ ...row, grantsProductIds, extraHotmartProductIds })
}

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
    const idConflict = await findCatalogProductIdConflict(data, id)
    if (idConflict) {
      return NextResponse.json({ error: idConflict }, { status: 400 })
    }

    const row = await prisma.catalogProduct.update({
      where: { id },
      data: catalogProductWriteData(data)
    })

    await syncCatalogProductGrants(row.id, data.grantsProductIds ?? [])
    await syncCatalogProductExternalIds(
      row.id,
      'HOTMART',
      data.extraHotmartProductIds ?? [],
      data.hotmartProductId
    )

    return NextResponse.json({
      product: await serializeAdminProduct(row)
    })
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

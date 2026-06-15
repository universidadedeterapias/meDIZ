import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  listCatalogProducts,
  serializeProduct
} from '@/lib/catalog/products'
import { formatCatalogDbError } from '@/lib/catalog/prisma-errors'
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
      data: catalogProductWriteData(data)
    })

    await syncCatalogProductGrants(row.id, data.grantsProductIds ?? [])
    await syncCatalogProductExternalIds(
      row.id,
      'HOTMART',
      data.extraHotmartProductIds ?? [],
      data.hotmartProductId
    )

    return NextResponse.json(
      { product: await serializeAdminProduct(row) },
      { status: 201 }
    )
  } catch (error) {
    console.error('[admin/catalog-products] POST:', error)
    return NextResponse.json(
      { error: formatCatalogDbError(error) },
      { status: 500 }
    )
  }
}

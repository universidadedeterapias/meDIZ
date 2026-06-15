import { NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { productMatchesUserLanguage } from '@/lib/catalog/locale'
import { serializeProduct, mapProductsToOffers } from '@/lib/catalog/products'
import { getProductEntitlementIdsForUser } from '@/lib/purchases/entitlements'
import { loadGrantsProductIds } from '@/lib/purchases/catalog-grants'
import { getLibraryPermissionsForUser } from '@/lib/library/permissions'
import { requireUser } from '@/lib/requireAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser({ pathname: '/api/catalog/products/[id]' })
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const row = await prisma.catalogProduct.findUnique({ where: { id } })
  if (!row || !row.active) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
  }

  const grantsProductIds = await loadGrantsProductIds(row.id)
  const product = serializeProduct({ ...row, grantsProductIds })
  const language = await getCurrentLanguage()
  if (!productMatchesUserLanguage(product.locale, language)) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND' }, { status: 404 })
  }

  const permissoes = await getLibraryPermissionsForUser(auth.user)
  const productEntitlements = await getProductEntitlementIdsForUser(auth.user)
  const lockedLabel = 'Desbloquear acesso'
  const [offer] = mapProductsToOffers(
    [product],
    permissoes,
    lockedLabel,
    undefined,
    productEntitlements
  )

  return NextResponse.json(
    { product: offer, permissoes },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

import { NextResponse } from 'next/server'
import { serializeProduct, mapProductsToOffers } from '@/lib/catalog/products'
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

  const product = serializeProduct(row)
  const permissoes = await getLibraryPermissionsForUser(auth.user)
  const lockedLabel = 'Desbloquear acesso'
  const [offer] = mapProductsToOffers([product], permissoes, lockedLabel)

  return NextResponse.json(
    { product: offer, permissoes },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

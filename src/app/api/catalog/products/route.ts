import { NextRequest, NextResponse } from 'next/server'
import type { CatalogSection } from '@prisma/client'
import { listCatalogProducts } from '@/lib/catalog/products'
import { getLibraryPermissionsForUser } from '@/lib/library/permissions'
import { mapProductsToOffers } from '@/lib/catalog/products'
import { requireUser } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

const SECTIONS: CatalogSection[] = ['BIBLIOTECA', 'AUDIOTERAPIA']

export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/catalog/products' })
  if (auth.ok === false) return auth.response

  const sectionParam = request.nextUrl.searchParams.get('section')?.toUpperCase()
  if (!sectionParam || !SECTIONS.includes(sectionParam as CatalogSection)) {
    return NextResponse.json(
      { error: 'section inválida (BIBLIOTECA ou AUDIOTERAPIA)' },
      { status: 400 }
    )
  }

  const section = sectionParam as CatalogSection
  const products = await listCatalogProducts({ section, activeOnly: true })
  const permissoes = await getLibraryPermissionsForUser(auth.user)

  const lockedLabel = 'Desbloquear acesso'
  const offers = mapProductsToOffers(products, permissoes, lockedLabel)

  return NextResponse.json(
    { products: offers, permissoes },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    }
  )
}

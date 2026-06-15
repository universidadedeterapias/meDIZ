import { NextRequest, NextResponse } from 'next/server'
import { getCurrentLanguage } from '@/i18n/server'
import { productMatchesUserLanguage } from '@/lib/catalog/locale'
import {
  filterProductsByListSection,
  isCatalogListSection
} from '@/lib/catalog/sections'
import { listCatalogProducts } from '@/lib/catalog/products'
import { getProductEntitlementIdsForUser } from '@/lib/purchases/entitlements'
import { getLibraryPermissionsForUser } from '@/lib/library/permissions'
import { mapProductsToOffers } from '@/lib/catalog/products'
import { requireUser } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/catalog/products' })
  if (auth.ok === false) return auth.response

  const sectionParam = request.nextUrl.searchParams.get('section')?.toUpperCase()
  if (!sectionParam || !isCatalogListSection(sectionParam)) {
    return NextResponse.json(
      { error: 'section inválida (BIBLIOTECA, AUDIOTERAPIA ou CURSOS)' },
      { status: 400 }
    )
  }

  const section = sectionParam
  const bibliotecaProducts =
    section === 'AUDIOTERAPIA'
      ? []
      : await listCatalogProducts({
          section: 'BIBLIOTECA',
          activeOnly: true
        })
  const audioterapiaProducts =
    section === 'BIBLIOTECA' || section === 'CURSOS'
      ? []
      : await listCatalogProducts({
          section: 'AUDIOTERAPIA',
          activeOnly: true
        })
  const products = filterProductsByListSection(
    [...bibliotecaProducts, ...audioterapiaProducts],
    section
  )
  const permissoes = await getLibraryPermissionsForUser(auth.user)
  const productEntitlements = await getProductEntitlementIdsForUser(auth.user)

  const lockedLabel = 'Desbloquear acesso'
  const language = await getCurrentLanguage()
  const offers = mapProductsToOffers(
    products,
    permissoes,
    lockedLabel,
    undefined,
    productEntitlements
  ).filter(
    (product) => productMatchesUserLanguage(product.locale, language)
  )

  return NextResponse.json(
    { products: offers, permissoes },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    }
  )
}

import type { CatalogPermissionKey, CatalogSection } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type CatalogProductRef = {
  section: CatalogSection
  permissionKey: CatalogPermissionKey
  locale?: 'pt' | 'en' | 'es' | null
  pdfIndex?: number
  titleIncludes?: string
}

export async function resolveCatalogProductByRef(
  ref: CatalogProductRef
): Promise<{ id: string; title: string } | null> {
  const rows = await prisma.catalogProduct.findMany({
    where: {
      active: true,
      section: ref.section,
      permissionKey: ref.permissionKey,
      ...(ref.pdfIndex != null ? { pdfIndex: ref.pdfIndex } : {})
    },
    select: { id: true, title: true, locale: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  })

  if (rows.length === 0) return null

  let filtered = rows

  if (ref.locale != null) {
    const withLocale = rows.filter((row) => row.locale === ref.locale)
    if (withLocale.length > 0) {
      filtered = withLocale
    } else if (ref.locale === 'pt') {
      filtered = rows.filter((row) => row.locale == null || row.locale === '')
    } else {
      return null
    }
  }

  const needle = ref.titleIncludes?.trim().toLowerCase()
  if (needle) {
    const withTitle = filtered.filter((row) =>
      row.title.toLowerCase().includes(needle)
    )
    if (withTitle.length > 0) {
      filtered = withTitle
    }
  }

  const match = filtered[0]
  return match ? { id: match.id, title: match.title } : null
}

export async function resolveCatalogProductRefs(
  refs: CatalogProductRef[]
): Promise<string[]> {
  const ids: string[] = []
  for (const ref of refs) {
    const product = await resolveCatalogProductByRef(ref)
    if (product) ids.push(product.id)
  }
  return [...new Set(ids)]
}

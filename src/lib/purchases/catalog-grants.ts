import { prisma } from '@/lib/prisma'

export async function syncCatalogProductGrants(
  sourceProductId: string,
  grantedProductIds: string[]
): Promise<void> {
  const unique = [
    ...new Set(
      grantedProductIds.filter((id) => id && id !== sourceProductId)
    )
  ]

  await prisma.catalogProductGrant.deleteMany({
    where: { sourceProductId }
  })

  if (unique.length === 0) return

  await prisma.catalogProductGrant.createMany({
    data: unique.map((grantedProductId) => ({
      sourceProductId,
      grantedProductId
    }))
  })
}

export async function loadGrantsProductIds(
  sourceProductId: string
): Promise<string[]> {
  const rows = await prisma.catalogProductGrant.findMany({
    where: { sourceProductId },
    select: { grantedProductId: true },
    orderBy: { grantedProductId: 'asc' }
  })
  return rows.map((r) => r.grantedProductId)
}

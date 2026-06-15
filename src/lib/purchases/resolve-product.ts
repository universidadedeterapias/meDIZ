import { prisma } from '@/lib/prisma'

export async function resolveCatalogProductByHotmartId(
  hotmartProductId: string
): Promise<{ id: string; title: string } | null> {
  const id = hotmartProductId.trim()
  if (!id) return null

  const product = await prisma.catalogProduct.findFirst({
    where: { hotmartProductId: id, active: true },
    select: { id: true, title: true }
  })
  if (product) return product

  const external = await prisma.catalogProductExternalId.findFirst({
    where: {
      provider: 'HOTMART',
      externalId: id,
      catalogProduct: { active: true }
    },
    select: {
      catalogProduct: { select: { id: true, title: true } }
    }
  })

  return external?.catalogProduct ?? null
}

export async function resolveCatalogProductByStoneId(
  stoneProductId: string
): Promise<{ id: string; title: string } | null> {
  const id = stoneProductId.trim()
  if (!id) return null

  const product = await prisma.catalogProduct.findFirst({
    where: { stoneProductId: id, active: true },
    select: { id: true, title: true }
  })
  if (product) return product

  const mapRaw = process.env.STONE_COURSE_PRODUCT_MAP?.trim()
  if (!mapRaw) return null

  for (const entry of mapRaw.split(',')) {
    const [stoneKey, catalogId] = entry.split(':').map((s) => s.trim())
    if (stoneKey === id && catalogId) {
      const mapped = await prisma.catalogProduct.findFirst({
        where: { id: catalogId, active: true },
        select: { id: true, title: true }
      })
      if (mapped) return mapped
    }
  }

  return null
}

export async function collectProductIdsToGrant(
  sourceProductId: string
): Promise<string[]> {
  const grants = await prisma.catalogProductGrant.findMany({
    where: { sourceProductId },
    select: { grantedProductId: true }
  })
  const ids = new Set<string>([sourceProductId])
  for (const g of grants) {
    ids.add(g.grantedProductId)
  }
  return [...ids]
}

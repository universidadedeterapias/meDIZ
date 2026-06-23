import { prisma } from '@/lib/prisma'

export async function findCatalogProductIdConflict(
  input: {
    hotmartProductId?: string | null
    stoneProductId?: string | null
  },
  excludeProductId?: string
): Promise<string | null> {
  const hotmart = input.hotmartProductId?.trim()
  const stone = input.stoneProductId?.trim()

  if (hotmart) {
    const existing = await prisma.catalogProduct.findFirst({
      where: {
        hotmartProductId: hotmart,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {})
      },
      select: { title: true }
    })
    if (existing) {
      return `O ID Hotmart "${hotmart}" já está cadastrado no produto "${existing.title}". Cada ID só pode pertencer a um curso/produto.`
    }
  }

  if (stone) {
    const existing = await prisma.catalogProduct.findFirst({
      where: {
        stoneProductId: stone,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {})
      },
      select: { title: true }
    })
    if (existing) {
      return `O ID Stone "${stone}" já está cadastrado no produto "${existing.title}". Cada ID só pode pertencer a um curso/produto.`
    }
  }

  return null
}

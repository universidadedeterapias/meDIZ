import type { PaymentProvider } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function syncCatalogProductExternalIds(
  catalogProductId: string,
  provider: PaymentProvider,
  externalIds: string[],
  primaryExternalId?: string | null
): Promise<void> {
  const primary = primaryExternalId?.trim() || null
  const unique = [
    ...new Set(
      externalIds
        .map((id) => id.trim())
        .filter(Boolean)
        .filter((id) => id !== primary)
    )
  ]

  await prisma.catalogProductExternalId.deleteMany({
    where: { catalogProductId, provider }
  })

  if (unique.length === 0) return

  await prisma.catalogProductExternalId.createMany({
    data: unique.map((externalId) => ({
      catalogProductId,
      provider,
      externalId
    }))
  })
}

export async function loadExtraHotmartProductIds(
  catalogProductId: string
): Promise<string[]> {
  const rows = await prisma.catalogProductExternalId.findMany({
    where: { catalogProductId, provider: 'HOTMART' },
    select: { externalId: true },
    orderBy: { externalId: 'asc' }
  })
  return rows.map((r) => r.externalId)
}

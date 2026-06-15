import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'

export async function getProductEntitlementIdsForEmail(
  email: string
): Promise<Set<string>> {
  const normalizedEmail = normalizeLibraryEmail(email)
  const rows = await prisma.productEntitlement.findMany({
    where: { email: normalizedEmail },
    select: { catalogProductId: true }
  })
  return new Set(rows.map((r) => r.catalogProductId))
}

export async function getProductEntitlementIdsForUser(user: {
  id: string
  email: string
}): Promise<Set<string>> {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true }
  })
  const email = dbUser?.email ?? user.email
  return getProductEntitlementIdsForEmail(email)
}

export async function userHasProductEntitlement(
  email: string,
  catalogProductId: string
): Promise<boolean> {
  const normalizedEmail = normalizeLibraryEmail(email)
  const row = await prisma.productEntitlement.findUnique({
    where: {
      email_catalogProductId: {
        email: normalizedEmail,
        catalogProductId
      }
    },
    select: { id: true }
  })
  return !!row
}

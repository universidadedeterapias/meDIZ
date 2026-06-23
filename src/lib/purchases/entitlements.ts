import { prisma } from '@/lib/prisma'
import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
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

async function mergeComplimentaryCourseEntitlements(
  email: string,
  userId: string,
  entitled: Set<string>
): Promise<Set<string>> {
  if (!hasComplimentaryAccess(email, userId)) return entitled

  const courses = await prisma.catalogProduct.findMany({
    where: { permissionKey: 'VIDEO', active: true },
    select: { id: true }
  })

  for (const course of courses) {
    entitled.add(course.id)
  }

  return entitled
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
  const entitled = await getProductEntitlementIdsForEmail(email)
  return mergeComplimentaryCourseEntitlements(email, user.id, entitled)
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

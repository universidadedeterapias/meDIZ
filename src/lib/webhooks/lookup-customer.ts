import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  getLibraryPermissionsByEmail,
  getLibraryPermissionsForUser,
  type LibraryPermissoes
} from '@/lib/library/permissions'
import {
  getProductEntitlementIdsForEmail,
  getProductEntitlementIdsForUser
} from '@/lib/purchases/entitlements'

export type WebhookCustomerProduct = {
  id: string
  title: string
  permissionKey: string
  source: string | null
}

export type WebhookCustomerUser = {
  id: string
  email: string
  name: string | null
  full_name: string | null
  whatsapp: string | null
  cpf: string | null
  must_reset_password: boolean
  has_temporary_password: boolean
  email_verified: boolean
  created_at: string
}

export type WebhookCustomerLookup = {
  exists: boolean
  email: string
  user: WebhookCustomerUser | null
  permissoes: LibraryPermissoes
  products_granted: WebhookCustomerProduct[]
}

async function loadGrantedProducts(
  email: string,
  productIds: Set<string>
): Promise<WebhookCustomerProduct[]> {
  if (productIds.size === 0) return []

  const ids = [...productIds]
  const normalizedEmail = normalizeLibraryEmail(email)

  const [rows, entitlements] = await Promise.all([
    prisma.catalogProduct.findMany({
      where: { id: { in: ids }, active: true },
      select: { id: true, title: true, permissionKey: true }
    }),
    prisma.productEntitlement.findMany({
      where: { email: normalizedEmail, catalogProductId: { in: ids } },
      select: { catalogProductId: true, source: true },
      orderBy: { createdAt: 'desc' }
    })
  ])

  const sourceByProduct = new Map<string, string>()
  for (const row of entitlements) {
    if (!sourceByProduct.has(row.catalogProductId)) {
      sourceByProduct.set(row.catalogProductId, row.source)
    }
  }

  return rows.map((product) => ({
    id: product.id,
    title: product.title,
    permissionKey: product.permissionKey,
    source: sourceByProduct.get(product.id) ?? null
  }))
}

export async function lookupWebhookCustomer(
  rawEmail: string
): Promise<WebhookCustomerLookup> {
  const email = normalizeLibraryEmail(rawEmail)

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      fullName: true,
      whatsapp: true,
      cpf: true,
      mustResetPassword: true,
      temporaryPasswordPlain: true,
      emailVerified: true,
      createdAt: true
    }
  })

  const permissoes = user
    ? await getLibraryPermissionsForUser({ id: user.id, email: user.email })
    : await getLibraryPermissionsByEmail(email)

  const entitledIds = user
    ? await getProductEntitlementIdsForUser({ id: user.id, email: user.email })
    : await getProductEntitlementIdsForEmail(email)

  const products_granted = await loadGrantedProducts(email, entitledIds)

  return {
    exists: !!user,
    email,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          full_name: user.fullName,
          whatsapp: user.whatsapp,
          cpf: user.cpf,
          must_reset_password: user.mustResetPassword,
          has_temporary_password: !!user.temporaryPasswordPlain,
          email_verified: !!user.emailVerified,
          created_at: user.createdAt.toISOString()
        }
      : null,
    permissoes,
    products_granted
  }
}

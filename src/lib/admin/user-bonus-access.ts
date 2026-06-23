import type { CatalogPermissionKey } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hasComplimentaryAccess } from '@/lib/complimentaryAccess'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  getLibraryPermissionsByEmail,
  type LibraryPermissoes
} from '@/lib/library/permissions'
import { isFreeCatalogProduct } from '@/lib/catalog/freeProducts'
import { permissionKeyToLib } from '@/lib/catalog/types'
import { getProductEntitlementIdsForUser } from '@/lib/purchases/entitlements'

export type UserBonusProductRow = {
  id: string
  title: string
  granted: boolean
  source: string | null
  revocable: boolean
}

export type UserBonusCategory = {
  key: CatalogPermissionKey
  label: string
  products: UserBonusProductRow[]
}

export type UserBonusAccessSnapshot = {
  email: string
  permissoes: LibraryPermissoes
  categories: UserBonusCategory[]
}

export type UpdateUserBonusInput = {
  email: string
  adminUserId: string
  grantProductIds?: string[]
  revokeProductIds?: string[]
}

export type UpdateUserBonusResult = {
  granted: number
  revoked: number
  permissoes: LibraryPermissoes
}

const CATEGORY_ORDER: CatalogPermissionKey[] = [
  'AUDIOTERAPIA',
  'PDF',
  'LIVRO_DIGITAL',
  'VIDEO'
]

const CATEGORY_LABELS: Record<CatalogPermissionKey, string> = {
  AUDIOTERAPIA: 'Audioterapia',
  PDF: 'PDF',
  LIVRO_DIGITAL: 'Livro digital',
  VIDEO: 'Cursos'
}

const REVOCABLE_SOURCES = new Set(['manual', 'migration', 'library_permissions_api'])

function isProductGranted(
  product: {
    id: string
    permissionKey: CatalogPermissionKey
    paymentProvider: string
    freeAccess: boolean
  },
  entitledIds: Set<string>,
  permissoes: LibraryPermissoes,
  complimentaryCourses: boolean
): boolean {
  if (isFreeCatalogProduct(product)) return true
  if (entitledIds.has(product.id)) return true
  if (complimentaryCourses && product.permissionKey === 'VIDEO') return true
  if (
    product.paymentProvider === 'STONE' ||
    product.permissionKey === 'VIDEO'
  ) {
    return entitledIds.has(product.id)
  }
  const key = permissionKeyToLib(product.permissionKey)
  return permissoes[key]
}

export async function getUserBonusAccessSnapshot(
  userId: string,
  email: string
): Promise<UserBonusAccessSnapshot> {
  const normalizedEmail = normalizeLibraryEmail(email)
  const permissoes = await getLibraryPermissionsByEmail(normalizedEmail, userId)
  const entitledIds = await getProductEntitlementIdsForUser({
    id: userId,
    email: normalizedEmail
  })
  const complimentaryCourses = hasComplimentaryAccess(normalizedEmail, userId)

  const entitlementRows = await prisma.productEntitlement.findMany({
    where: { email: normalizedEmail },
    select: { catalogProductId: true, source: true }
  })
  const sourceByProductId = new Map(
    entitlementRows.map((row) => [row.catalogProductId, row.source])
  )

  const products = await prisma.catalogProduct.findMany({
    where: {
      active: true,
      permissionKey: { in: CATEGORY_ORDER }
    },
    select: {
      id: true,
      title: true,
      permissionKey: true,
      paymentProvider: true,
      freeAccess: true,
      sortOrder: true
    },
    orderBy: [{ permissionKey: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }]
  })

  const categories: UserBonusCategory[] = CATEGORY_ORDER.map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    products: products
      .filter((product) => product.permissionKey === key)
      .map((product) => {
        const granted = isProductGranted(
          product,
          entitledIds,
          permissoes,
          complimentaryCourses
        )
        const source = sourceByProductId.get(product.id) ?? null
        const revocable =
          granted &&
          !!source &&
          REVOCABLE_SOURCES.has(source) &&
          !product.freeAccess

        return {
          id: product.id,
          title: product.title,
          granted,
          source,
          revocable
        }
      })
  }))

  return {
    email: normalizedEmail,
    permissoes,
    categories
  }
}

export async function updateUserBonuses(
  input: UpdateUserBonusInput
): Promise<UpdateUserBonusResult> {
  const email = normalizeLibraryEmail(input.email)
  const suffix = `admin_${input.adminUserId}_${Date.now()}`
  let granted = 0
  let revoked = 0

  const grantIds = [...new Set(input.grantProductIds ?? [])]
  const revokeIds = [...new Set(input.revokeProductIds ?? [])]

  if (grantIds.length > 0) {
    const validProducts = await prisma.catalogProduct.findMany({
      where: {
        id: { in: grantIds },
        active: true,
        permissionKey: { in: CATEGORY_ORDER }
      },
      select: { id: true }
    })

    for (const product of validProducts) {
      const existing = await prisma.productEntitlement.findUnique({
        where: {
          email_catalogProductId: {
            email,
            catalogProductId: product.id
          }
        },
        select: { id: true }
      })
      if (existing) continue

      await prisma.productEntitlement.create({
        data: {
          email,
          catalogProductId: product.id,
          source: 'manual',
          externalTransactionId: `manual_${suffix}_${product.id}`
        }
      })
      granted++
    }
  }

  if (revokeIds.length > 0) {
    const rows = await prisma.productEntitlement.findMany({
      where: {
        email,
        catalogProductId: { in: revokeIds },
        source: { in: [...REVOCABLE_SOURCES] }
      },
      select: { id: true, catalogProductId: true }
    })

    if (rows.length > 0) {
      await prisma.productEntitlement.deleteMany({
        where: { id: { in: rows.map((row) => row.id) } }
      })
      revoked = rows.length
    }
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  })

  const permissoes = user
    ? await getLibraryPermissionsByEmail(email, user.id)
    : await getLibraryPermissionsByEmail(email)

  return { granted, revoked, permissoes }
}

import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import type { LibraryPermissoes } from '@/lib/library/permissions'
import {
  DEFAULT_TEMPORARY_PASSWORD,
  hashPassword
} from '@/lib/library/temporaryPassword'
import type { CatalogPermissionKey } from '@prisma/client'

function permissionKeysForFlag(
  flag: keyof LibraryPermissoes
): CatalogPermissionKey[] {
  switch (flag) {
    case 'livro_digital':
      return ['LIVRO_DIGITAL']
    case 'pdf':
      return ['PDF']
    case 'audioterapia':
      return ['AUDIOTERAPIA']
  }
}

export async function ensureLibraryUser(input: {
  email: string
  nome?: string | null
  cpf?: string | null
}): Promise<{ userCreated: boolean; temporaryPassword: string | null }> {
  const normalizedEmail = normalizeLibraryEmail(input.email)
  const nome = input.nome?.trim() || null
  const cpfDigits = input.cpf?.trim() || null

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, cpf: true, temporaryPasswordPlain: true }
  })

  if (!existingUser) {
    const temporaryPassword = DEFAULT_TEMPORARY_PASSWORD
    const passwordHash = await hashPassword(temporaryPassword)
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: nome,
        fullName: nome,
        cpf: cpfDigits,
        passwordHash,
        temporaryPasswordPlain: temporaryPassword,
        mustResetPassword: true,
        emailVerified: new Date()
      }
    })
    return { userCreated: true, temporaryPassword }
  }

  if (cpfDigits || nome) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(nome ? { name: nome, fullName: nome } : {}),
        ...(cpfDigits && !existingUser.cpf ? { cpf: cpfDigits } : {})
      }
    })
  }

  return {
    userCreated: false,
    temporaryPassword: existingUser.temporaryPasswordPlain
  }
}

export async function grantEntitlementsFromLegacyFlags(input: {
  email: string
  permissoes: LibraryPermissoes
  source: 'manual' | 'migration' | 'library_permissions_api'
  transactionSuffix?: string
}): Promise<{ entitlementsCreated: number; productIds: string[] }> {
  const email = normalizeLibraryEmail(input.email)
  const activeFlags = (
    ['livro_digital', 'pdf', 'audioterapia'] as const
  ).filter((flag) => input.permissoes[flag])

  if (activeFlags.length === 0) {
    return { entitlementsCreated: 0, productIds: [] }
  }

  const permissionKeys = [
    ...new Set(activeFlags.flatMap((flag) => permissionKeysForFlag(flag)))
  ]

  const products = await prisma.catalogProduct.findMany({
    where: {
      active: true,
      permissionKey: { in: permissionKeys },
      freeAccess: false
    },
    select: { id: true }
  })

  let entitlementsCreated = 0
  const productIds: string[] = []
  const suffix = input.transactionSuffix?.trim() || 'legacy'

  for (const product of products) {
    const extId = `${input.source}_${suffix}_${product.id}`
    const existing = await prisma.productEntitlement.findUnique({
      where: { externalTransactionId: extId },
      select: { id: true }
    })
    if (existing) {
      productIds.push(product.id)
      continue
    }

    await prisma.productEntitlement.create({
      data: {
        email,
        catalogProductId: product.id,
        source: input.source,
        externalTransactionId: extId
      }
    })
    entitlementsCreated++
    productIds.push(product.id)
  }

  return { entitlementsCreated, productIds }
}

export async function libraryPermissoesFromEntitlements(
  email: string
): Promise<LibraryPermissoes> {
  const normalizedEmail = normalizeLibraryEmail(email)
  const rows = await prisma.productEntitlement.findMany({
    where: { email: normalizedEmail },
    include: {
      catalogProduct: { select: { permissionKey: true } }
    }
  })

  const perms: LibraryPermissoes = {
    audioterapia: false,
    pdf: false,
    livro_digital: false
  }

  for (const row of rows) {
    switch (row.catalogProduct.permissionKey) {
      case 'LIVRO_DIGITAL':
        perms.livro_digital = true
        break
      case 'PDF':
        perms.pdf = true
        break
      case 'AUDIOTERAPIA':
        perms.audioterapia = true
        break
      default:
        break
    }
  }

  return perms
}

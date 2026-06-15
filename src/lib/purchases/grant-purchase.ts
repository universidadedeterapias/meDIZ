import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  generateTemporaryPassword,
  hashPassword
} from '@/lib/library/temporaryPassword'
import { collectProductIdsToGrant } from '@/lib/purchases/resolve-product'

export type GrantedProductSummary = {
  id: string
  title: string
}

export type GrantPurchaseAccessInput = {
  email: string
  sourceCatalogProductId: string
  externalTransactionId: string
  source: 'hotmart' | 'stone' | 'manual'
  nome?: string | null
  cpf?: string | null
}

export type GrantPurchaseAccessResult = {
  userCreated: boolean
  temporaryPassword: string | null
  productsGranted: GrantedProductSummary[]
  entitlementsCreated: number
}

export async function grantPurchaseAccess(
  input: GrantPurchaseAccessInput
): Promise<GrantPurchaseAccessResult> {
  const email = normalizeLibraryEmail(input.email)
  const nome = input.nome?.trim() || null
  const cpfDigits = input.cpf?.trim() || null
  const productIds = await collectProductIdsToGrant(input.sourceCatalogProductId)

  const products = await prisma.catalogProduct.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true, title: true }
  })

  if (products.length === 0) {
    throw new Error('CATALOG_PRODUCT_NOT_FOUND')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, cpf: true, temporaryPasswordPlain: true }
  })

  let userCreated = false
  let temporaryPassword: string | null = null

  if (!existingUser) {
    temporaryPassword = generateTemporaryPassword(10)
    const passwordHash = await hashPassword(temporaryPassword)
    await prisma.user.create({
      data: {
        email,
        name: nome,
        fullName: nome,
        cpf: cpfDigits,
        passwordHash,
        temporaryPasswordPlain: temporaryPassword,
        mustResetPassword: true,
        emailVerified: new Date()
      }
    })
    userCreated = true
  } else {
    if (cpfDigits || nome) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          ...(nome ? { name: nome, fullName: nome } : {}),
          ...(cpfDigits && !existingUser.cpf ? { cpf: cpfDigits } : {})
        }
      })
    }
    temporaryPassword = existingUser.temporaryPasswordPlain
  }

  let entitlementsCreated = 0
  const productsGranted: GrantedProductSummary[] = []

  for (const product of products) {
    const extId = `${input.source}_${input.externalTransactionId}_${product.id}`
    const existing = await prisma.productEntitlement.findUnique({
      where: { externalTransactionId: extId },
      select: { id: true }
    })
    if (existing) {
      productsGranted.push({ id: product.id, title: product.title })
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
    productsGranted.push({ id: product.id, title: product.title })
  }

  return {
    userCreated,
    temporaryPassword: userCreated ? temporaryPassword : null,
    productsGranted,
    entitlementsCreated
  }
}

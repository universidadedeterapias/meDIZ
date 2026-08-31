import { prisma } from '@/lib/prisma'
import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  DEFAULT_TEMPORARY_PASSWORD,
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
  /**
   * Quando definido, ignora grants automáticos do catálogo e libera só estes
   * produtos.
   *
   * Lista vazia é uma resposta legítima, e não "não informado": o livro impresso
   * é uma compra que não desbloqueia nada na tela — o que ela entrega vai pelos
   * Correios. Antes, vazio caía no grant padrão do catálogo, que para o impresso
   * significa o livro digital: exatamente o upsell que a compra não inclui.
   */
  grantProductIds?: string[]
}

export type GrantPurchaseAccessResult = {
  userId: string
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
  // `undefined` e `[]` querem dizer coisas opostas, entao a checagem e pela
  // presenca, e nao pelo tamanho.
  const grantExplicito = input.grantProductIds !== undefined
  const productIds = grantExplicito
    ? [...new Set(input.grantProductIds)]
    : await collectProductIdsToGrant(input.sourceCatalogProductId)

  const products = await prisma.catalogProduct.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true, title: true }
  })

  // So e erro quando ninguem escolheu: o produto da venda nao resolveu para nada
  // no catalogo, e ai a venda esta mesmo quebrada. Quem escolheu liberar nada
  // escolheu — a conta e criada, a compra e registrada, e nao ha entitlement.
  if (products.length === 0 && !grantExplicito) {
    throw new Error('CATALOG_PRODUCT_NOT_FOUND')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, cpf: true, temporaryPasswordPlain: true }
  })

  let userCreated = false
  let temporaryPassword: string | null = null
  let userId: string

  if (!existingUser) {
    temporaryPassword = DEFAULT_TEMPORARY_PASSWORD
    const passwordHash = await hashPassword(temporaryPassword)
    const created = await prisma.user.create({
      data: {
        email,
        name: nome,
        fullName: nome,
        cpf: cpfDigits,
        passwordHash,
        temporaryPasswordPlain: temporaryPassword,
        mustResetPassword: true,
        emailVerified: new Date()
      },
      select: { id: true }
    })
    userId = created.id
    userCreated = true
  } else {
    userId = existingUser.id
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

    // A tabela tem duas unicidades e elas nao dizem a mesma coisa:
    // `external_transaction_id` cobre reentrega do mesmo webhook, e
    // `(email, catalog_product_id)` diz que a pessoa ja tem o produto, tenha vindo
    // de onde tiver vindo. Conferir so a primeira e criar direto quebrava sempre
    // que alguem ja possuia o produto por outra compra — recompra apos reembolso,
    // ou combo que inclui um item avulso ja comprado. O webhook estourava e a
    // venda caia como `failed` mesmo com o acesso ja garantido.
    //
    // `createMany` com `skipDuplicates` resolve as duas de uma vez, sem race entre
    // os quatro webhooks que a Hotmart dispara para a mesma compra.
    const { count } = await prisma.productEntitlement.createMany({
      data: [
        {
          email,
          catalogProductId: product.id,
          source: input.source,
          externalTransactionId: extId
        }
      ],
      skipDuplicates: true
    })

    entitlementsCreated += count
    productsGranted.push({ id: product.id, title: product.title })
  }

  return {
    userId,
    userCreated,
    temporaryPassword: userCreated ? temporaryPassword : null,
    productsGranted,
    entitlementsCreated
  }
}

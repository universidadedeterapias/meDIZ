/** @deprecated Use @/lib/purchases/entitlements */
export {
  getProductEntitlementIdsForEmail as getCourseEntitlementProductIdsForEmail,
  getProductEntitlementIdsForUser as getCourseEntitlementProductIdsForUser,
  userHasProductEntitlement as userHasCourseEntitlement
} from '@/lib/purchases/entitlements'

export { resolveCatalogProductByStoneId as resolveCatalogProductIdByStoneProductId } from '@/lib/purchases/resolve-product'

import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'

export type GrantCourseAccessInput = {
  email: string
  catalogProductId: string
  externalTransactionId: string
  nome?: string | null
  cpf?: string | null
  source?: string
}

export type GrantCourseAccessResult = {
  userCreated: boolean
  entitlementCreated: boolean
}

/** @deprecated Use grantPurchaseAccess */
export async function grantCourseAccess(
  input: GrantCourseAccessInput
): Promise<GrantCourseAccessResult> {
  const result = await grantPurchaseAccess({
    email: input.email,
    sourceCatalogProductId: input.catalogProductId,
    externalTransactionId: input.externalTransactionId,
    source: (input.source as 'stone') ?? 'stone',
    nome: input.nome,
    cpf: input.cpf
  })
  return {
    userCreated: result.userCreated,
    entitlementCreated: result.entitlementsCreated > 0
  }
}

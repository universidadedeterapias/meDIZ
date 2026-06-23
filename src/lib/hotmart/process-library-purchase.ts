import { normalizeLibraryEmail } from '@/lib/library/email'
import {
  ensureLibraryUser,
  grantEntitlementsFromLegacyFlags,
  libraryPermissoesFromEntitlements
} from '@/lib/purchases/migrate-legacy-permissions'

import type { LibraryPermissoes } from '@/lib/library/permissions'

export type ProcessLibraryPurchaseInput = {
  email: string
  nome?: string | null
  cpf?: string | null
  permissoes: LibraryPermissoes
}

export type ProcessLibraryPurchaseResult = {
  userCreated: boolean
  permissions: LibraryPermissoes & { email: string; nome: string | null }
}

/** @deprecated Prefer grantPurchaseAccess / grantEntitlementsFromLegacyFlags */
export async function processLibraryPurchase(
  input: ProcessLibraryPurchaseInput
): Promise<ProcessLibraryPurchaseResult> {
  const normalizedEmail = normalizeLibraryEmail(input.email)

  const { userCreated } = await ensureLibraryUser({
    email: normalizedEmail,
    nome: input.nome,
    cpf: input.cpf
  })

  await grantEntitlementsFromLegacyFlags({
    email: normalizedEmail,
    permissoes: input.permissoes,
    source: 'manual',
    transactionSuffix: 'process_library_purchase'
  })

  const perms = await libraryPermissoesFromEntitlements(normalizedEmail)
  return {
    userCreated,
    permissions: {
      email: normalizedEmail,
      nome: input.nome?.trim() || null,
      ...perms
    }
  }
}

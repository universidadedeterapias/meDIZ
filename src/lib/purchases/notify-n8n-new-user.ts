import { logger } from '@/lib/logger'
import type { GrantedProductSummary } from '@/lib/purchases/grant-purchase'

export type NotifyN8nNewUserInput = {
  userCreated: boolean
  email: string
  nome?: string | null
  telefone?: string | null
  temporaryPassword: string | null
  transactionId: string
  provider: 'hotmart' | 'stone'
  productsGranted: GrantedProductSummary[]
}

export async function notifyN8nNewUser(
  input: NotifyN8nNewUserInput
): Promise<void> {
  if (!input.userCreated) return

  const url = process.env.N8N_NEW_USER_WEBHOOK_URL?.trim()
  if (!url) {
    logger.debug(
      'N8N_NEW_USER_WEBHOOK_URL não configurado — onboarding n8n ignorado',
      '[purchases/n8n]'
    )
    return
  }

  if (!input.temporaryPassword) {
    logger.warn(
      'user_created sem temporary_password — n8n não notificado',
      '[purchases/n8n]'
    )
    return
  }

  const body = {
    email: input.email,
    nome: input.nome ?? null,
    telefone: input.telefone ?? null,
    temporary_password: input.temporaryPassword,
    transaction_id: input.transactionId,
    provider: input.provider,
    products_granted: input.productsGranted
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) {
      logger.warn(
        `n8n onboarding webhook HTTP ${res.status}`,
        '[purchases/n8n]'
      )
    }
  } catch (error) {
    logger.error(
      'Falha ao chamar n8n onboarding',
      error instanceof Error ? error : undefined,
      '[purchases/n8n]'
    )
  }
}

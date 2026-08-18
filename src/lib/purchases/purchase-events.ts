import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'

/**
 * Registro das compras recebidas por webhook.
 *
 * Todas as funcoes aqui engolem os proprios erros: a gravacao do evento e
 * observabilidade, e nao pode derrubar a liberacao de acesso de quem pagou. Se o
 * banco falhar, o webhook segue e no maximo perdemos o rastro daquela venda.
 */

export type PurchaseEventStatus =
  /** Gravado, ainda sem desfecho. */
  | 'received'
  /** Acesso liberado com sucesso. */
  | 'processed'
  /** Produto sem mapeamento no catalogo — precisa de cadastro no admin. */
  | 'pending_mapping'
  /** Evento que nao gera acesso (cancelamento, produto de outro fluxo). */
  | 'ignored'
  /** Tentamos liberar e deu erro. */
  | 'failed'

export type RecordPurchaseEventInput = {
  provider: string
  externalTransactionId: string
  payload: unknown
  eventType?: string | null
  externalProductId?: string | null
  externalProductName?: string | null
  email?: string | null
  nome?: string | null
  telefone?: string | null
  cpf?: string | null
  currency?: string | null
  country?: string | null
  status?: PurchaseEventStatus
  catalogProductId?: string | null
  reason?: string | null
}

/** Truncar em vez de estourar o VARCHAR: perder o fim do nome e melhor que perder a venda. */
function cut(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function isTerminal(status: PurchaseEventStatus): boolean {
  return status !== 'received'
}

/**
 * Grava (ou atualiza) o evento da compra. Chamar ANTES de tentar liberar acesso,
 * para que uma falha no meio do caminho ainda deixe a venda registrada.
 *
 * Idempotente por (provider, externalTransactionId): reentrega do webhook
 * atualiza a linha existente. Retorna o id, ou null se a gravacao falhou.
 */
export async function recordPurchaseEvent(
  input: RecordPurchaseEventInput
): Promise<string | null> {
  const provider = input.provider.trim().toLowerCase()
  const externalTransactionId = input.externalTransactionId.trim()

  if (!provider || !externalTransactionId) {
    logger.warn(
      'Evento de compra sem provider ou transaction — nao registrado',
      '[purchases/events]'
    )
    return null
  }

  const status = input.status ?? 'received'
  const data = {
    eventType: cut(input.eventType, 120),
    externalProductId: cut(input.externalProductId, 120),
    externalProductName: cut(input.externalProductName, 255),
    email: input.email ? normalizeLibraryEmail(input.email) : null,
    nome: cut(input.nome, 255),
    telefone: cut(input.telefone, 40),
    cpf: cut(input.cpf, 20),
    currency: cut(input.currency, 10),
    country: cut(input.country, 10),
    status,
    catalogProductId: input.catalogProductId ?? null,
    reason: cut(input.reason, 255),
    payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    processedAt: isTerminal(status) ? new Date() : null
  }

  try {
    const row = await prisma.purchaseEvent.upsert({
      where: {
        provider_externalTransactionId: { provider, externalTransactionId }
      },
      create: { provider, externalTransactionId, ...data },
      update: data,
      select: { id: true }
    })
    return row.id
  } catch (error) {
    logger.error(
      'Falha ao registrar evento de compra',
      error instanceof Error ? error : undefined,
      '[purchases/events]'
    )
    return null
  }
}

export type SettlePurchaseEventInput = {
  status: PurchaseEventStatus
  catalogProductId?: string | null
  reason?: string | null
}

/**
 * Fecha o evento com o desfecho da tentativa de liberar acesso.
 *
 * `id` nulo (a gravacao inicial falhou) e no-op: sem linha para atualizar, nao ha
 * o que fazer, e o webhook nao pode parar por isso.
 */
export async function settlePurchaseEvent(
  id: string | null,
  input: SettlePurchaseEventInput
): Promise<void> {
  if (!id) return

  try {
    await prisma.purchaseEvent.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.catalogProductId !== undefined
          ? { catalogProductId: input.catalogProductId }
          : {}),
        reason: cut(input.reason, 255),
        processedAt: isTerminal(input.status) ? new Date() : null
      }
    })
  } catch (error) {
    logger.error(
      'Falha ao atualizar desfecho do evento de compra',
      error instanceof Error ? error : undefined,
      '[purchases/events]'
    )
  }
}

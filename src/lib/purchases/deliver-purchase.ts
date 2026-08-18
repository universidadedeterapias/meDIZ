import type { PurchaseEvent } from '@prisma/client'
import { logger } from '@/lib/logger'
import {
  getBuyerCpf,
  getBuyerEmail,
  getBuyerName,
  getBuyerPhone,
  getProductId
} from '@/lib/hotmart/buyer'
import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'
import {
  HOTMART_PHYSICAL_BOOK_IDS,
  isHotmartBookProduct,
  resolveHotmartGrantProductIds
} from '@/lib/purchases/hotmart-grant-rules'
import { deliverAccess } from '@/lib/purchases/deliver-access'
import { settlePurchaseEvent } from '@/lib/purchases/purchase-events'
import {
  resolveCatalogProductByHotmartId,
  resolveCatalogProductByStoneId
} from '@/lib/purchases/resolve-product'
import { startBookOnboarding } from '@/lib/purchases/start-book-onboarding'
import { parseStoneWebhook } from '@/lib/stone/parse-webhook'
import type { HotmartPayload } from '@/types/hotmart'

/**
 * Libera o acesso a partir de um evento de compra ja registrado.
 *
 * Nasceu para reprocessar a fila de pendentes — a venda que chegou antes de o
 * produto estar mapeado — e por isso trabalha sobre o payload guardado, e nao
 * sobre a requisicao. E o primeiro passo do `deliverPurchase` unico do plano: os
 * webhooks devem migrar para ca conforme forem sendo esvaziados.
 *
 * Cobre o caminho de catalogo (produto -> entitlement). A assinatura, que resolve
 * `Plan` e cria `Subscription`, continua no webhook por enquanto.
 */

export type DeliverFailure = {
  ok: false
  status: 'pending_mapping' | 'failed'
  reason: string
}

export type DeliverResult =
  | { ok: true; productsGranted: { id: string; title: string }[] }
  | DeliverFailure

type ResolvedPurchase = {
  catalogProductId: string
  grantProductIds?: string[]
  email: string
  nome: string | null
  cpf: string | null
  telefone: string | null
  transactionId: string
  source: 'hotmart' | 'stone'
  externalProductId: string | null
  isBook: boolean
  /** Tem despacho fisico — o aviso ao cliente precisa falar do rastreio. */
  physicalShipment: boolean
  currency: string | null
  country: string | null
}

async function resolveFromHotmart(
  event: PurchaseEvent
): Promise<ResolvedPurchase | DeliverFailure> {
  const payload = event.payload as unknown as HotmartPayload

  const productId = event.externalProductId ?? getProductId(payload)
  if (!productId) {
    return { ok: false, status: 'failed', reason: 'Payload sem product.id' }
  }

  const product = await resolveCatalogProductByHotmartId(productId)
  if (!product) {
    return {
      ok: false,
      status: 'pending_mapping',
      reason: `Produto ${productId} continua sem mapeamento no catálogo`
    }
  }

  const email = event.email ?? getBuyerEmail(payload)
  if (!email) {
    return { ok: false, status: 'failed', reason: 'Payload sem e-mail' }
  }

  return {
    catalogProductId: product.id,
    grantProductIds: await resolveHotmartGrantProductIds(productId, product.id),
    email,
    nome: event.nome ?? getBuyerName(payload),
    cpf: event.cpf ?? getBuyerCpf(payload),
    telefone: event.telefone ?? getBuyerPhone(payload),
    transactionId: event.externalTransactionId,
    source: 'hotmart',
    externalProductId: productId,
    isBook: isHotmartBookProduct(productId),
    physicalShipment: HOTMART_PHYSICAL_BOOK_IDS.has(productId.trim()),
    currency: event.currency,
    country: event.country
  }
}

async function resolveFromStone(
  event: PurchaseEvent
): Promise<ResolvedPurchase | DeliverFailure> {
  const parsed = parseStoneWebhook(
    event.payload as Record<string, unknown>
  )
  if (!parsed) {
    return { ok: false, status: 'failed', reason: 'Payload Stone ilegível' }
  }

  const catalogProductId =
    parsed.catalogProductId ??
    (parsed.stoneProductId
      ? (await resolveCatalogProductByStoneId(parsed.stoneProductId))?.id ?? null
      : null)

  if (!catalogProductId) {
    return {
      ok: false,
      status: 'pending_mapping',
      reason: parsed.stoneProductId
        ? `Produto Stone ${parsed.stoneProductId} continua sem mapeamento`
        : 'Payload sem identificação de produto'
    }
  }

  return {
    catalogProductId,
    email: parsed.email,
    nome: parsed.nome,
    cpf: parsed.cpf,
    telefone: event.telefone,
    transactionId: event.externalTransactionId,
    source: 'stone',
    externalProductId: parsed.stoneProductId ?? null,
    isBook: false,
    physicalShipment: false,
    currency: event.currency,
    country: event.country
  }
}

function isFailure(
  value: ResolvedPurchase | DeliverFailure
): value is DeliverFailure {
  return 'ok' in value
}

/**
 * O tsconfig do projeto roda com `strict: false`, e sem `strictNullChecks` o
 * TypeScript nao estreita uniao discriminada por booleano (`result.ok`). Este
 * type guard faz o estreitamento explicitamente, para quem consome o resultado.
 */
export function isDeliverFailure(
  result: DeliverResult
): result is DeliverFailure {
  return result.ok === false
}

export async function deliverFromPurchaseEvent(
  event: PurchaseEvent
): Promise<DeliverResult> {
  let resolved: ResolvedPurchase | DeliverFailure

  switch (event.provider) {
    case 'hotmart':
      resolved = await resolveFromHotmart(event)
      break
    case 'stone':
      resolved = await resolveFromStone(event)
      break
    default:
      resolved = {
        ok: false,
        status: 'failed',
        reason: `Provedor ${event.provider} não suportado no reprocessamento`
      }
  }

  if (isFailure(resolved)) {
    await settlePurchaseEvent(event.id, {
      status: resolved.status,
      reason: resolved.reason
    })
    return resolved
  }

  try {
    const grant = await grantPurchaseAccess({
      email: resolved.email,
      nome: resolved.nome,
      cpf: resolved.cpf,
      sourceCatalogProductId: resolved.catalogProductId,
      externalTransactionId: resolved.transactionId,
      source: resolved.source,
      grantProductIds: resolved.grantProductIds
    })

    if (resolved.isBook) {
      await startBookOnboarding({
        userId: grant.userId,
        email: resolved.email,
        name: resolved.nome,
        source: resolved.source,
        externalTransactionId: resolved.transactionId,
        currency: resolved.currency,
        country: resolved.country
      })
    }

    await deliverAccess({
      userId: grant.userId,
      email: resolved.email,
      userCreated: grant.userCreated,
      nome: resolved.nome,
      telefone: resolved.telefone,
      transactionId: resolved.transactionId,
      provider: resolved.source,
      externalProductId: resolved.externalProductId,
      physicalShipment: resolved.physicalShipment,
      productsGranted: grant.productsGranted,
      purchaseEventId: event.id
    })

    await settlePurchaseEvent(event.id, {
      status: 'processed',
      catalogProductId: resolved.catalogProductId,
      reason: 'Liberado no reprocessamento'
    })

    return { ok: true, productsGranted: grant.productsGranted }
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Falha ao liberar acesso'
    logger.error(
      'Falha ao reprocessar evento de compra',
      error instanceof Error ? error : undefined,
      '[purchases/deliver]'
    )
    await settlePurchaseEvent(event.id, {
      status: 'failed',
      catalogProductId: resolved.catalogProductId,
      reason
    })
    return { ok: false, status: 'failed', reason }
  }
}

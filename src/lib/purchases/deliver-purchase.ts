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
  resolveHotmartGrantProductIds,
  resolvePhysicalBookGrantProductIds
} from '@/lib/purchases/hotmart-grant-rules'
import {
  isBookPurchase,
  isPhysicalBookProduct
} from '@/lib/purchases/book-purchase'
import { deliverAccess } from '@/lib/purchases/deliver-access'
import { ensureBookShipment } from '@/lib/shipping/book-shipment'
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
  /** Nome do produto da venda. E o que a mensagem do impresso anuncia. */
  catalogProductTitle: string | null
  grantProductIds?: string[]
  email: string
  nome: string | null
  cpf: string | null
  telefone: string | null
  transactionId: string
  source: 'hotmart' | 'stone'
  externalProductId: string | null
  /**
   * Compra do livro. Decide a mensagem, os 7 dias de Profissional e a esteira.
   *
   * Vale igual para Hotmart e para o checkout Guru: o `parseStoneWebhook` passou
   * a ler moeda e pais, entao a esteira do comprador de la sai no idioma certo.
   */
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

  const ehLivro = await isBookPurchase({
    provider: 'hotmart',
    externalProductId: productId,
    catalogProductId: product.id
  })

  return {
    catalogProductId: product.id,
    catalogProductTitle: product.title,
    grantProductIds: await resolveHotmartGrantProductIds(productId, product.id),
    email,
    nome: event.nome ?? getBuyerName(payload),
    cpf: event.cpf ?? getBuyerCpf(payload),
    telefone: event.telefone ?? getBuyerPhone(payload),
    transactionId: event.externalTransactionId,
    source: 'hotmart',
    externalProductId: productId,
    isBook: ehLivro,
    physicalShipment: isPhysicalBookProduct('hotmart', productId),
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

  // Guarda o produto inteiro, e nao so o id: a mensagem da compra com despacho
  // anuncia o titulo, e busca-lo de novo seria uma consulta a mais em toda venda
  // Stone. Fica null quando o proprio payload ja trouxe o id do catalogo — ai nao
  // houve resolucao, e o aviso cai na busca pelos produtos liberados.
  const resolvido = parsed.catalogProductId
    ? null
    : parsed.stoneProductId
      ? await resolveCatalogProductByStoneId(parsed.stoneProductId)
      : null

  const catalogProductId = parsed.catalogProductId ?? resolvido?.id ?? null
  const temDespacho = isPhysicalBookProduct('stone', parsed.stoneProductId)

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
    catalogProductTitle: resolvido?.title ?? null,
    // Mesmo motivo do caminho Hotmart: o impresso aponta para o produto de
    // catalogo do digital, entao o grant padrao daria de graca o upsell.
    grantProductIds: temDespacho
      ? await resolvePhysicalBookGrantProductIds()
      : undefined,
    email: parsed.email,
    nome: parsed.nome,
    cpf: parsed.cpf,
    telefone: event.telefone,
    transactionId: event.externalTransactionId,
    source: 'stone',
    externalProductId: parsed.stoneProductId ?? null,
    // O livro tambem sai pelo checkout Guru, que cobra pela Stone. Dizer `false`
    // aqui fazia toda venda Guru avisar como se fosse curso, e nenhuma venda do
    // impresso por esse caminho virar despacho.
    isBook: await isBookPurchase({
      provider: 'stone',
      externalProductId: parsed.stoneProductId,
      catalogProductId
    }),
    physicalShipment: temDespacho,
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

export type DeliverOptions = {
  /**
   * `false` libera o acesso sem falar com o cliente: nenhum `AccessDelivery`,
   * nenhuma esteira de e-mail, nenhum despacho. E para a venda que ficou parada
   * por mapeamento errado depois de o comprador ja ter sido avisado pelo item
   * principal do mesmo pedido — avisar de novo so confundiria quem ja esta
   * dentro. Fora desse caso, entregue com aviso.
   */
  notify?: boolean
  /** Texto gravado no evento. O padrao descreve o reprocessamento comum. */
  reason?: string
}

export async function deliverFromPurchaseEvent(
  event: PurchaseEvent,
  options: DeliverOptions = {}
): Promise<DeliverResult> {
  const notify = options.notify !== false
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

    if (resolved.isBook && notify) {
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

    // Registrado antes do aviso: o aviso carrega o id do despacho, e e por ele
    // que a planilha da grafica devolve o codigo de rastreio. Por isso anda
    // junto com o `notify` — despachar em silencio deixaria um envio que
    // ninguem cobra.
    const shipment = resolved.physicalShipment && notify
      ? await ensureBookShipment({
          purchaseEventId: event.id,
          userId: grant.userId,
          email: resolved.email,
          nome: resolved.nome,
          telefone: resolved.telefone,
          provider: resolved.source,
          externalTransactionId: resolved.transactionId,
          externalProductId: resolved.externalProductId
        })
      : null

    if (notify) {
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
        shipmentId: shipment?.id ?? null,
        mainProductTitle: resolved.catalogProductTitle,
        productsGranted: grant.productsGranted,
        purchaseEventId: event.id,
        bookPurchase: resolved.isBook
      })
    }

    await settlePurchaseEvent(event.id, {
      status: 'processed',
      catalogProductId: resolved.catalogProductId,
      reason:
        options.reason ??
        (notify ? 'Liberado no reprocessamento' : 'Liberado sem aviso')
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

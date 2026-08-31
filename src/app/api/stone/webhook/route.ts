import { NextRequest, NextResponse } from 'next/server'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'
import { resolvePhysicalBookGrantProductIds } from '@/lib/purchases/hotmart-grant-rules'
import {
  isBookPurchase,
  isPhysicalBookProduct
} from '@/lib/purchases/book-purchase'
import { deliverAccess } from '@/lib/purchases/deliver-access'
import { ensureBookShipment } from '@/lib/shipping/book-shipment'
import {
  recordPurchaseEvent,
  settlePurchaseEvent
} from '@/lib/purchases/purchase-events'
import {
  resolveCatalogProductByStoneId
} from '@/lib/purchases/resolve-product'
import {
  isStonePaidEvent,
  isStoneRefundEvent,
  parseStoneWebhook
} from '@/lib/stone/parse-webhook'
import { validateWebhookBearerWhenConfigured } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearerWhenConfigured(
    request,
    'STONE_WEBHOOK_SECRET'
  )
  if (authError) return authError

  try {
    const bodyText = await request.text()
    if (!bodyText?.trim()) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(bodyText) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = parseStoneWebhook(payload)
    if (!parsed) {
      return NextResponse.json(
        { received: true, ignored: true, reason: 'incomplete_payload' },
        { status: 200 }
      )
    }

    if (isStoneRefundEvent(parsed.eventType)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        reason: 'refund_not_implemented',
        event: parsed.eventType
      })
    }

    if (!isStonePaidEvent(parsed.eventType)) {
      return NextResponse.json({
        received: true,
        ignored: true,
        event: parsed.eventType
      })
    }

    // Venda Guru tambem chega por aqui: o Guru cobra por Pagar.me/Stone. O
    // registro guarda a transacao mesmo quando o produto ainda nao tem mapeamento.
    const purchaseEventId = await recordPurchaseEvent({
      provider: 'stone',
      eventType: parsed.eventType,
      externalTransactionId: parsed.transactionId,
      externalProductId: parsed.stoneProductId,
      email: parsed.email,
      nome: parsed.nome,
      telefone: parsed.telefone,
      cpf: parsed.cpf,
      payload
    })

    let catalogProductId = parsed.catalogProductId
    // O titulo so serve a compra com despacho, que anuncia o nome do livro na
    // mensagem. Null quando o proprio payload trouxe o id do catalogo — ai nao
    // houve resolucao, e o aviso cai na busca pelos produtos liberados.
    let catalogProductTitle: string | null = null
    if (!catalogProductId && parsed.stoneProductId) {
      const resolved = await resolveCatalogProductByStoneId(
        parsed.stoneProductId
      )
      catalogProductId = resolved?.id ?? null
      catalogProductTitle = resolved?.title ?? null
    }

    if (!catalogProductId) {
      await settlePurchaseEvent(purchaseEventId, {
        status: 'pending_mapping',
        reason: parsed.stoneProductId
          ? `Produto Stone ${parsed.stoneProductId} sem mapeamento no catálogo`
          : 'Payload sem identificação de produto'
      })
      return NextResponse.json(
        {
          received: true,
          pending_mapping: true,
          error: 'COURSE_PRODUCT_NOT_MAPPED',
          stoneProductId: parsed.stoneProductId
        },
        { status: 200 }
      )
    }

    // O livro tambem e vendido no checkout Guru, que cobra pela Stone e cai
    // aqui. Ate agora esta rota tratava toda venda como curso — a mensagem saia
    // igual para qualquer produto, e o impresso vendido por aqui nao virava
    // despacho nenhum.
    //
    // Vem antes da liberacao porque o impresso muda o que se libera: no Guru ele
    // tambem aponta para o produto de catalogo do digital, entao deixar o grant
    // padrao decidir daria o digital de brinde — o mesmo upsell que a oferta
    // seguinte vende.
    //
    // O que continua faltando e o `startBookOnboarding` (7 dias de Profissional
    // + esteira): ele escolhe o idioma pela moeda e pelo pais, e o
    // `parseStoneWebhook` ainda nao le nem um nem outro — o comprador de EL
    // CUERPO HABLA cairia na esteira em portugues. Ler esses dois campos e o
    // passo que falta para ligar o onboarding aqui tambem.
    const ehLivro = await isBookPurchase({
      provider: 'stone',
      externalProductId: parsed.stoneProductId,
      catalogProductId
    })
    const temDespacho =
      ehLivro && isPhysicalBookProduct('stone', parsed.stoneProductId)

    const grant = await grantPurchaseAccess({
      email: parsed.email,
      nome: parsed.nome,
      cpf: parsed.cpf,
      sourceCatalogProductId: catalogProductId,
      externalTransactionId: parsed.transactionId,
      source: 'stone',
      grantProductIds: temDespacho
        ? await resolvePhysicalBookGrantProductIds()
        : undefined
    })

    // Antes do aviso porque o aviso leva o id do despacho: e por ele que a
    // planilha da grafica devolve o codigo de rastreio.
    const shipment = temDespacho
      ? await ensureBookShipment({
          purchaseEventId,
          userId: grant.userId,
          email: parsed.email,
          nome: parsed.nome,
          telefone: parsed.telefone,
          provider: 'stone',
          externalTransactionId: parsed.transactionId,
          externalProductId: parsed.stoneProductId
        })
      : null

    await deliverAccess({
      userId: grant.userId,
      email: normalizeLibraryEmail(parsed.email),
      userCreated: grant.userCreated,
      nome: parsed.nome,
      telefone: parsed.telefone,
      transactionId: parsed.transactionId,
      provider: 'stone',
      externalProductId: parsed.stoneProductId,
      physicalShipment: temDespacho,
      shipmentId: shipment?.id ?? null,
      mainProductTitle: catalogProductTitle,
      productsGranted: grant.productsGranted,
      purchaseEventId,
      bookPurchase: ehLivro
    })

    await settlePurchaseEvent(purchaseEventId, {
      status: 'processed',
      catalogProductId
    })

    return NextResponse.json({
      received: true,
      success: true,
      action: 'catalog_access_granted',
      catalogProductId,
      email: normalizeLibraryEmail(parsed.email),
      user_created: grant.userCreated,
      temporary_password: grant.temporaryPassword,
      products_granted: grant.productsGranted,
      entitlements_created: grant.entitlementsCreated
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'CATALOG_PRODUCT_NOT_FOUND'
    ) {
      return NextResponse.json(
        { received: true, error: 'CATALOG_PRODUCT_NOT_FOUND' },
        { status: 200 }
      )
    }

    console.error('[stone/webhook]', error)
    return NextResponse.json(
      { received: true, error: 'WEBHOOK_HANDLER_FAILED' },
      { status: 200 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'stone_catalog_webhook',
    message: 'POST JSON (charge.paid / order.paid) — sem autenticação'
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { grantPurchaseAccess } from '@/lib/purchases/grant-purchase'
import { notifyN8nNewUser } from '@/lib/purchases/notify-n8n-new-user'
import {
  resolveCatalogProductByStoneId
} from '@/lib/purchases/resolve-product'
import {
  isStonePaidEvent,
  isStoneRefundEvent,
  parseStoneWebhook
} from '@/lib/stone/parse-webhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

    let catalogProductId = parsed.catalogProductId
    if (!catalogProductId && parsed.stoneProductId) {
      const resolved = await resolveCatalogProductByStoneId(
        parsed.stoneProductId
      )
      catalogProductId = resolved?.id ?? null
    }

    if (!catalogProductId) {
      return NextResponse.json(
        {
          received: true,
          error: 'COURSE_PRODUCT_NOT_MAPPED',
          stoneProductId: parsed.stoneProductId
        },
        { status: 200 }
      )
    }

    const grant = await grantPurchaseAccess({
      email: parsed.email,
      nome: parsed.nome,
      cpf: parsed.cpf,
      sourceCatalogProductId: catalogProductId,
      externalTransactionId: parsed.transactionId,
      source: 'stone'
    })

    await notifyN8nNewUser({
      userCreated: grant.userCreated,
      email: normalizeLibraryEmail(parsed.email),
      nome: parsed.nome,
      telefone: null,
      temporaryPassword: grant.temporaryPassword,
      transactionId: parsed.transactionId,
      provider: 'stone',
      productsGranted: grant.productsGranted
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

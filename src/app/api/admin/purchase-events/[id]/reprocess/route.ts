import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import {
  deliverFromPurchaseEvent,
  isDeliverFailure
} from '@/lib/purchases/deliver-purchase'
import { logAuditAction } from '@/lib/auditLogger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Reprocessa uma venda parada — o caminho normal depois de cadastrar o ID que
 * faltava. Reentregar acesso e idempotente: `grantPurchaseAccess` deduplica pelo
 * `externalTransactionId`, entao repetir nao gera entitlement duplicado.
 */
export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params

  const event = await prisma.purchaseEvent.findUnique({ where: { id } })
  if (!event) {
    return NextResponse.json(
      { error: 'Venda não encontrada' },
      { status: 404 }
    )
  }

  if (event.status === 'processed') {
    return NextResponse.json({
      ok: true,
      already_processed: true,
      message: 'Esta venda já foi liberada.'
    })
  }

  const result = await deliverFromPurchaseEvent(event)
  const failure = isDeliverFailure(result) ? result : null

  await logAuditAction({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: 'PURCHASE_EVENT_REPROCESS',
    resource: 'purchase_events',
    resourceId: event.id,
    details: {
      provider: event.provider,
      externalProductId: event.externalProductId,
      outcome: failure ? failure.status : 'processed'
    }
  })

  if (failure) {
    return NextResponse.json(
      { ok: false, status: failure.status, reason: failure.reason },
      { status: failure.status === 'pending_mapping' ? 409 : 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    products_granted: (result as { productsGranted: unknown }).productsGranted
  })
}

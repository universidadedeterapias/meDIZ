import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set([
  'received',
  'processed',
  'pending_mapping',
  'ignored',
  'failed'
])

/**
 * Fila de vendas recebidas. O uso principal e `status=pending_mapping`: as compras
 * que chegaram de produto ainda nao cadastrado e que ninguem recebeu.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const statusParam = request.nextUrl.searchParams.get('status')
  const status =
    statusParam && VALID_STATUSES.has(statusParam) ? statusParam : null

  const limitParam = Number(request.nextUrl.searchParams.get('limit'))
  const take = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 50

  const events = await prisma.purchaseEvent.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      provider: true,
      eventType: true,
      externalTransactionId: true,
      externalProductId: true,
      externalProductName: true,
      email: true,
      nome: true,
      status: true,
      reason: true,
      catalogProductId: true,
      createdAt: true,
      processedAt: true
    }
  })

  // Agrupa por produto para o admin ver de quantas vendas cada mapeamento
  // faltante esta segurando — e o que decide qual cadastrar primeiro.
  const pendingByProduct = await prisma.purchaseEvent.groupBy({
    by: ['provider', 'externalProductId', 'externalProductName'],
    where: { status: 'pending_mapping' },
    _count: { _all: true }
  })

  return NextResponse.json({
    items: events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      processedAt: event.processedAt?.toISOString() ?? null
    })),
    pending_by_product: pendingByProduct
      .map((row) => ({
        provider: row.provider,
        external_product_id: row.externalProductId,
        external_product_name: row.externalProductName,
        vendas_paradas: row._count._all
      }))
      .sort((a, b) => b.vendas_paradas - a.vendas_paradas)
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { retryPendingDeliveries } from '@/lib/purchases/deliver-access'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set(['pending', 'sent', 'failed'])

/** Avisos de acesso. O uso principal e `status=failed` — quem pagou e nao soube. */
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

  const [items, counts] = await Promise.all([
    prisma.accessDelivery.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        email: true,
        kind: true,
        status: true,
        attempts: true,
        lastError: true,
        purchaseEventId: true,
        sentAt: true,
        createdAt: true
      }
    }),
    prisma.accessDelivery.groupBy({
      by: ['status'],
      _count: { _all: true }
    })
  ])

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      sentAt: item.sentAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString()
    })),
    // O payload nao vai na listagem de proposito: leva o link de acesso, que e
    // credencial. Quem precisar reenviar usa o POST, que nao expoe o link.
    totals: Object.fromEntries(
      counts.map((row) => [row.status, row._count._all])
    )
  })
}

/** Reprocessa os avisos parados. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const limitParam = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) ? limitParam : 25

  const result = await retryPendingDeliveries(limit)
  return NextResponse.json({ ok: true, ...result })
}

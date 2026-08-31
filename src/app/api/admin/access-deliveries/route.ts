import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { retryPendingDeliveries } from '@/lib/purchases/deliver-access'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set(['pending', 'sent', 'failed', 'skipped'])

/**
 * Avisos de acesso. O uso principal e `status=failed` — quem pagou e nao soube.
 *
 * `skipped` responde a outra pergunta, e cada vez mais a comum: a compra existe,
 * o aviso nao saiu, e nao houve erro nenhum — a pessoa ja tinha recebido o dela.
 * O motivo fica em `payload.skipped_reason`.
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

  const offsetParam = Number(request.nextUrl.searchParams.get('offset'))
  const skip = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0

  // Busca por e-mail: no atendimento a pergunta quase sempre chega como "fulano
  // disse que nao recebeu", e nao como "me mostre os que falharam".
  const busca = request.nextUrl.searchParams.get('email')?.trim() || null

  const where = {
    ...(status ? { status } : {}),
    ...(busca ? { email: { contains: busca, mode: 'insensitive' as const } } : {})
  }
  const temFiltro = Boolean(status || busca)

  const [items, counts, total] = await Promise.all([
    prisma.accessDelivery.findMany({
      where: temFiltro ? where : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
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
    }),
    prisma.accessDelivery.count({ where: temFiltro ? where : undefined })
  ])

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      sentAt: item.sentAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString()
    })),
    // O payload nao vai na listagem de proposito: leva o link de acesso, que e
    // credencial. Quem precisar reenviar usa o POST, que nao expoe o link.
    //
    // `totals` conta a base inteira e nao muda com o filtro — e o painel de cima
    // da tela. `total` conta o recorte atual e e o que pagina.
    totals: Object.fromEntries(
      counts.map((row) => [row.status, row._count._all])
    ),
    total,
    limit: take,
    offset: skip
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

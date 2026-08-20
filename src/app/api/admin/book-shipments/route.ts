import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { SHIPMENT_STATUSES } from '@/lib/shipping/book-shipment'
import { carrierLabel } from '@/lib/shipping/carriers'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set<string>(SHIPMENT_STATUSES)

/**
 * Livros impressos a despachar.
 *
 * O recorte que importa e `aguardando_postagem` com dias de casa: e o livro que
 * a grafica nao postou e sobre o qual ninguem foi avisado. Por isso a resposta
 * traz `parados_ha_dias` alem dos totais por status.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const params = request.nextUrl.searchParams

  const statusParam = params.get('status')
  const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : null

  const limitParam = Number(params.get('limit'))
  const take = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 200)
    : 25

  const offsetParam = Number(params.get('offset'))
  const skip = Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0

  // Busca serve tanto para "fulano perguntou do livro" quanto para "de quem e
  // este codigo que a transportadora citou".
  const busca = params.get('busca')?.trim() || null

  const where = {
    ...(status ? { status } : {}),
    ...(busca
      ? {
          OR: [
            { email: { contains: busca, mode: 'insensitive' as const } },
            { nome: { contains: busca, mode: 'insensitive' as const } },
            { trackingCode: { contains: busca.toUpperCase() } }
          ]
        }
      : {})
  }
  const temFiltro = Boolean(status || busca)

  const quinzeDiasAtras = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)

  const [items, counts, total, parados] = await Promise.all([
    prisma.bookShipment.findMany({
      where: temFiltro ? where : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.bookShipment.groupBy({
      by: ['status'],
      _count: { _all: true }
    }),
    prisma.bookShipment.count({ where: temFiltro ? where : undefined }),
    prisma.bookShipment.count({
      where: {
        status: 'aguardando_postagem',
        createdAt: { lt: quinzeDiasAtras }
      }
    })
  ])

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      email: item.email,
      nome: item.nome,
      telefone: item.telefone,
      provider: item.provider,
      externalTransactionId: item.externalTransactionId,
      purchaseEventId: item.purchaseEventId,
      status: item.status,
      trackingCode: item.trackingCode,
      carrier: item.carrier,
      carrierLabel: item.trackingCode ? carrierLabel(item.carrier) : null,
      trackingUrl: item.trackingUrl,
      lastStatusLabel: item.lastStatusLabel,
      postedAt: item.postedAt?.toISOString() ?? null,
      deliveredAt: item.deliveredAt?.toISOString() ?? null,
      lastCheckedAt: item.lastCheckedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString()
    })),
    totals: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
    paradosHaDias: parados,
    total,
    limit: take,
    offset: skip
  })
}

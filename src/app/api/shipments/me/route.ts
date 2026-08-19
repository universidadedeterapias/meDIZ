import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { normalizeLibraryEmail } from '@/lib/library/email'
import { carrierLabel } from '@/lib/shipping/carriers'

export const dynamic = 'force-dynamic'

/**
 * Andamento do livro impresso do proprio comprador.
 *
 * Casa por e-mail alem do `userId` porque o despacho nasce no webhook, onde o
 * e-mail e a unica chave certa — a conta pode ter sido criada depois, ou a compra
 * ter caido numa conta que ja existia.
 */
export async function GET() {
  const auth = await requireUser({ pathname: '/api/shipments/me' })
  if (auth.ok === false) return auth.response

  const email = normalizeLibraryEmail(auth.user.email)

  const shipments = await prisma.bookShipment.findMany({
    where: { OR: [{ userId: auth.user.id }, { email }] },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      trackingCode: true,
      carrier: true,
      trackingUrl: true,
      lastStatusLabel: true,
      postedAt: true,
      deliveredAt: true,
      createdAt: true
    }
  })

  return NextResponse.json({
    shipments: shipments.map((s) => ({
      id: s.id,
      status: s.status,
      trackingCode: s.trackingCode,
      // So faz sentido nomear a transportadora quando ja existe codigo.
      carrierLabel: s.trackingCode ? carrierLabel(s.carrier) : null,
      trackingUrl: s.trackingUrl,
      lastStatusLabel: s.lastStatusLabel,
      postedAt: s.postedAt?.toISOString() ?? null,
      deliveredAt: s.deliveredAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString()
    }))
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { requireUser } from '@/lib/requireAuth'
import { marcaLivroRecebido } from '@/lib/journey/gatilhos'
import { normalizeLibraryEmail } from '@/lib/library/email'

export const dynamic = 'force-dynamic'

/**
 * "Recebi meu livro", dito pelo proprio comprador.
 *
 * Vale mais que a informacao da transportadora, e nao menos: quem tem o livro na
 * mao sabe melhor do que o sistema de rastreio. Por isso a confirmacao fecha o
 * despacho mesmo quando a transportadora ainda nao disse nada.
 *
 * E definitiva de proposito — nao existe desfazer. Confirmar por engano e raro e
 * o atendimento resolve; ja um botao de "na verdade nao recebi" convida a
 * desfazer sem pensar, e o estado do despacho e o que o suporte usa para decidir
 * se reenvia um livro. Errar para o lado de "o cliente falou, esta valendo" e
 * mais barato do que errar para o lado de reenviar sem precisar.
 *
 * So aceita despacho que ja saiu da grafica: confirmar recebimento de um livro
 * que ninguem postou nao e engano do cliente, e sinal de que ele esta olhando a
 * linha errada.
 */

const CONFIRMAVEIS = new Set(['postado', 'em_transito', 'entregue'])

export async function POST(request: NextRequest) {
  const auth = await requireUser({ pathname: '/api/shipments/me/confirmar' })
  if (auth.ok === false) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const shipmentId =
    body && typeof body === 'object'
      ? String((body as Record<string, unknown>).shipment_id ?? '').trim()
      : ''

  if (!shipmentId) {
    return NextResponse.json({ error: 'Informe shipment_id' }, { status: 400 })
  }

  const email = normalizeLibraryEmail(auth.user.email)

  // A dona do despacho e verificada aqui, e nao no update: id de despacho e
  // sequencial nenhum, mas tambem nao e segredo, e confirmar a entrega da
  // encomenda de outra pessoa nao pode depender de ninguem adivinhar um uuid.
  const shipment = await prisma.bookShipment.findFirst({
    where: {
      id: shipmentId,
      OR: [{ userId: auth.user.id }, { email }]
    },
    select: {
      id: true,
      status: true,
      deliveredAt: true,
      deliveryConfirmedAt: true
    }
  })

  if (!shipment) {
    return NextResponse.json(
      { error: 'Despacho não encontrado' },
      { status: 404 }
    )
  }

  // Confirmar duas vezes nao e erro — e alguem clicando de novo por duvida. Só
  // devolve o que ja vale, sem reescrever a data da primeira vez.
  if (shipment.deliveryConfirmedAt) {
    return NextResponse.json({
      ok: true,
      ja_confirmado: true,
      status: shipment.status,
      delivery_confirmed_at: shipment.deliveryConfirmedAt.toISOString()
    })
  }

  if (!CONFIRMAVEIS.has(shipment.status)) {
    return NextResponse.json(
      {
        error:
          shipment.status === 'aguardando_postagem'
            ? 'Este livro ainda não foi postado'
            : 'Este despacho não pode ser confirmado',
        status: shipment.status
      },
      { status: 409 }
    )
  }

  try {
    const agora = new Date()
    const atualizado = await prisma.bookShipment.update({
      where: { id: shipment.id },
      data: {
        deliveryConfirmedAt: agora,
        status: 'entregue',
        // A transportadora pode nunca ter avisado. Se ela ja avisou, a data dela
        // fica: ela sabe a hora da entrega melhor do que o clique.
        deliveredAt: shipment.deliveredAt ?? agora,
        lastStatusLabel: 'Recebimento confirmado pelo comprador'
      },
      select: { status: true, deliveryConfirmedAt: true }
    })

    // A pessoa dizendo que recebeu vale mais que a transportadora, e o corredor
    // trata as duas do mesmo jeito: o livro esta na mao dela. O caminho pela
    // transportadora sai do `applyTrackingUpdate`; este e o do botao, que nao
    // passa por la.
    marcaLivroRecebido(auth.user.id, agora)

    return NextResponse.json({
      ok: true,
      status: atualizado.status,
      delivery_confirmed_at:
        atualizado.deliveryConfirmedAt?.toISOString() ?? null
    })
  } catch (error) {
    logger.error(
      'Falha ao confirmar recebimento do livro',
      error instanceof Error ? error : undefined,
      '[shipments/me/confirmar]'
    )
    return NextResponse.json(
      { error: 'Não foi possível confirmar agora' },
      { status: 500 }
    )
  }
}

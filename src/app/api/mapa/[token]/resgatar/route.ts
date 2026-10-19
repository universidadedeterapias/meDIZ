import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { ehTokenPublico } from '@/lib/mapa/identidade'
import { resgatarComCredito } from '@/lib/mapa/pagamento'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Usa o credito da conta (pagamento sem Mapa vinculado) para liberar este Mapa. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // Quem acabou de pagar ainda nao definiu senha — e nao precisa, para isto.
  const sessao = await requireUser({ allowPasswordResetRequired: true })
  if (sessao.ok === false) return sessao.response

  const { token } = await params
  if (!ehTokenPublico(token)) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }
  const mapa = await prisma.mapaOrigem.findUnique({
    where: { publicToken: token },
    select: { id: true }
  })
  if (!mapa) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }

  const resultado = await resgatarComCredito({
    userId: sessao.user.id,
    mapaId: mapa.id
  })
  if (resultado.ok === false) {
    const mensagem =
      resultado.motivo === 'sem_credito'
        ? 'Não há pagamento disponível para liberar este Mapa.'
        : 'Este Mapa não pode mais ser liberado.'
    return NextResponse.json(
      { error: mensagem, motivo: resultado.motivo },
      { status: 409 }
    )
  }
  return NextResponse.json({ ok: true })
}

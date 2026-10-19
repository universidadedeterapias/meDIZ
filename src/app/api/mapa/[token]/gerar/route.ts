import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { COOKIE_DISPOSITIVO, ehTokenPublico, hashDe } from '@/lib/mapa/identidade'
import { dispararGeracao, MAX_TENTATIVAS_GERACAO } from '@/lib/mapa/geracao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * "Tentar de novo" depois de erro na geracao. So o aparelho que criou, so
 * Mapa em erro e nao pago, e com teto de tentativas — cada uma custa IA.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const segredo = request.cookies.get(COOKIE_DISPOSITIVO)?.value
  if (!ehTokenPublico(token) || !segredo) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }

  const mapa = await prisma.mapaOrigem.findUnique({ where: { publicToken: token } })
  if (!mapa || mapa.dispositivoHash !== hashDe(segredo)) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }
  if (mapa.paidAt || mapa.status !== 'erro') {
    return NextResponse.json(
      { error: 'Este Mapa não precisa ser gerado de novo.' },
      { status: 409 }
    )
  }
  if (mapa.tentativasGeracao >= MAX_TENTATIVAS_GERACAO) {
    return NextResponse.json(
      { error: 'Não conseguimos gerar este Mapa. Fale com a gente pelo WhatsApp.' },
      { status: 429 }
    )
  }

  await dispararGeracao(mapa)
  return NextResponse.json({ ok: true })
}

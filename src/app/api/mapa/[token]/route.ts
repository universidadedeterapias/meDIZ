import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ehTokenPublico } from '@/lib/mapa/identidade'
import { resolverGeracaoTravada } from '@/lib/mapa/geracao'
import { identificarLeitor, montarVisao } from '@/lib/mapa/leitura'
import { liberarParaAssinante } from '@/lib/mapa/pagamento'
import { isUserPremium } from '@/lib/premiumUtils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Status e conteudo do Mapa. A pagina pergunta aqui a cada 2 s enquanto gera,
 * e depois do checkout ate o pagamento cair. O conteudo so vem para quem pode
 * ler (ver `podeLerCompleto`).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!ehTokenPublico(token)) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }

  const encontrado = await prisma.mapaOrigem.findUnique({
    where: { publicToken: token }
  })
  if (!encontrado) {
    return NextResponse.json({ error: 'Mapa não encontrado' }, { status: 404 })
  }

  let mapa = await resolverGeracaoTravada(encontrado)
  const leitor = await identificarLeitor(request)

  // Assinante nao paga: o Mapa que ele gerou (mesmo aparelho) abre direto.
  // O aparelho e a prova de que o Mapa e dele — o token sozinho nao basta,
  // senao qualquer assinante liberaria o Mapa de outra pessoa pelo link.
  if (
    mapa.status === 'pronto' &&
    !mapa.paidAt &&
    leitor.userId &&
    leitor.dispositivoHash &&
    mapa.dispositivoHash === leitor.dispositivoHash &&
    (await isUserPremium(leitor.userId)) &&
    (await liberarParaAssinante({ userId: leitor.userId, mapaId: mapa.id }))
  ) {
    mapa = await prisma.mapaOrigem.findUniqueOrThrow({ where: { id: mapa.id } })
  }

  const visao = await montarVisao(mapa, leitor)

  return NextResponse.json(visao, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}

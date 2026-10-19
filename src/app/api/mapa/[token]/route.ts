import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ehTokenPublico } from '@/lib/mapa/identidade'
import { resolverGeracaoTravada } from '@/lib/mapa/geracao'
import { identificarLeitor, montarVisao } from '@/lib/mapa/leitura'

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

  const mapa = await resolverGeracaoTravada(encontrado)
  const visao = await montarVisao(mapa, await identificarLeitor(request))

  return NextResponse.json(visao, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}

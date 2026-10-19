import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/requireAuth'
import { COOKIE_DISPOSITIVO, hashDe } from '@/lib/mapa/identidade'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

/**
 * Os Mapas da conta (Biblioteca › Meus Mapas) e, para a tela de resgate, os
 * creditos sem uso e os Mapas prontos e sem dono gerados neste aparelho.
 */
export async function GET(request: NextRequest) {
  const sessao = await requireUser({ allowPasswordResetRequired: true })
  if (sessao.ok === false) return sessao.response

  const segredo = request.cookies.get(COOKIE_DISPOSITIVO)?.value

  const [meus, creditos, desteAparelho] = await Promise.all([
    prisma.mapaOrigem.findMany({
      where: { userId: sessao.user.id, paidAt: { not: null } },
      orderBy: { paidAt: 'desc' },
      select: {
        publicToken: true,
        nome: true,
        sintoma: true,
        paidAt: true,
        createdAt: true
      }
    }),
    prisma.mapaCredito.count({
      where: { userId: sessao.user.id, usadoEm: null }
    }),
    segredo
      ? prisma.mapaOrigem.findMany({
          where: {
            dispositivoHash: hashDe(segredo),
            paidAt: null,
            status: 'pronto',
            createdAt: { gte: new Date(Date.now() - SETE_DIAS) }
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { publicToken: true, nome: true, sintoma: true, createdAt: true }
        })
      : Promise.resolve([])
  ])

  return NextResponse.json(
    {
      mapas: meus.map((m) => ({
        token: m.publicToken,
        nome: m.nome,
        sintoma: m.sintoma,
        pagoEm: m.paidAt?.toISOString() ?? null,
        criadoEm: m.createdAt.toISOString()
      })),
      creditos,
      desteAparelho: desteAparelho.map((m) => ({
        token: m.publicToken,
        nome: m.nome,
        sintoma: m.sintoma,
        criadoEm: m.createdAt.toISOString()
      }))
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

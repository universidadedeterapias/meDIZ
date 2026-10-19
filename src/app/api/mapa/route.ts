import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { entradaMapaSchema } from '@/lib/mapa/entrada'
import { dispararGeracao } from '@/lib/mapa/geracao'
import {
  COOKIE_DISPOSITIVO,
  gerarSegredoDispositivo,
  gerarTokenPublico,
  hashDe,
  normalizarTelefoneLink
} from '@/lib/mapa/identidade'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cria o Mapa e dispara a geracao. Publica, sem login (tela 1 do /mapa).
 *
 * Cada chamada custa uma geracao de IA, entao o limite e por tres chaves — IP,
 * aparelho e telefone — contado no proprio banco (o Redis e opcional no
 * deploy). E o mesmo aparelho pedindo o mesmo sintoma no mesmo dia recebe o
 * Mapa que ja existe, em vez de pagar outra geracao.
 */

const LIMITE_POR_HORA_IP = 5
const LIMITE_POR_HORA_DISPOSITIVO = 5
const LIMITE_POR_DIA_TELEFONE = 5
const HORA = 60 * 60 * 1000
const DIA = 24 * HORA
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60

function ipDe(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'desconhecido'
  )
}

function responder(
  corpo: { token: string; reaproveitado: boolean },
  segredo: string,
  gravarCookie: boolean
): NextResponse {
  const resposta = NextResponse.json(corpo, { status: 201 })
  if (gravarCookie) {
    resposta.cookies.set(COOKIE_DISPOSITIVO, segredo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE
    })
  }
  return resposta
}

export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null)
  const parsed = entradaMapaSchema.safeParse(corpo)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Preencha seu nome e o que você sente.' },
      { status: 400 }
    )
  }
  const entrada = parsed.data

  const segredoExistente = request.cookies.get(COOKIE_DISPOSITIVO)?.value
  const segredo = segredoExistente || gerarSegredoDispositivo()
  const dispositivoHash = hashDe(segredo)
  // Com sal: o banco guarda so o suficiente para contar, nao o IP.
  const ipHash = hashDe(`${process.env.NEXTAUTH_SECRET ?? ''}:${ipDe(request)}`)
  const telefone = normalizarTelefoneLink(entrada.telefone)

  try {
    const agora = Date.now()

    const existente = await prisma.mapaOrigem.findFirst({
      where: {
        dispositivoHash,
        sintoma: { equals: entrada.sintoma, mode: 'insensitive' },
        nome: { equals: entrada.nome, mode: 'insensitive' },
        status: { in: ['gerando', 'pronto'] },
        createdAt: { gte: new Date(agora - DIA) }
      },
      orderBy: { createdAt: 'desc' },
      select: { publicToken: true }
    })
    if (existente) {
      return responder(
        { token: existente.publicToken, reaproveitado: true },
        segredo,
        !segredoExistente
      )
    }

    const [porIp, porDispositivo, porTelefone] = await Promise.all([
      prisma.mapaOrigem.count({
        where: { ipHash, createdAt: { gte: new Date(agora - HORA) } }
      }),
      prisma.mapaOrigem.count({
        where: { dispositivoHash, createdAt: { gte: new Date(agora - HORA) } }
      }),
      telefone
        ? prisma.mapaOrigem.count({
            where: { telefone, createdAt: { gte: new Date(agora - DIA) } }
          })
        : Promise.resolve(0)
    ])
    if (
      porIp >= LIMITE_POR_HORA_IP ||
      porDispositivo >= LIMITE_POR_HORA_DISPOSITIVO ||
      porTelefone >= LIMITE_POR_DIA_TELEFONE
    ) {
      return NextResponse.json(
        { error: 'Muitos Mapas gerados em pouco tempo. Tente de novo mais tarde.' },
        { status: 429 }
      )
    }

    const mapa = await prisma.mapaOrigem.create({
      data: {
        publicToken: gerarTokenPublico(),
        telefone,
        nome: entrada.nome,
        sintoma: entrada.sintoma,
        tempo: entrada.tempo,
        momentos: entrada.momentos.length
          ? (entrada.momentos as unknown as Prisma.InputJsonValue)
          : undefined,
        familia: entrada.familia,
        dispositivoHash,
        ipHash,
        utm: entrada.utm ? (entrada.utm as Prisma.InputJsonValue) : undefined
      }
    })

    await dispararGeracao(mapa)

    return responder(
      { token: mapa.publicToken, reaproveitado: false },
      segredo,
      !segredoExistente
    )
  } catch (error) {
    logger.error(
      'Falha ao criar o Mapa',
      error instanceof Error ? error : undefined,
      '[api/mapa]'
    )
    return NextResponse.json(
      { error: 'Não foi possível gerar agora. Tente de novo.' },
      { status: 500 }
    )
  }
}

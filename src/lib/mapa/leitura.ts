import type { MapaOrigem } from '@prisma/client'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { COOKIE_DISPOSITIVO, hashDe } from './identidade'
import { checkoutMapaUrl, precoMapaExibido } from './produto'

/**
 * Quem esta lendo, e o que pode ver.
 *
 * O bloqueio e daqui, nao do CSS: antes do pagamento a API devolve so a capa.
 * O borrado da tela 2 e decoracao — o conteudo nunca vai para o navegador de
 * quem nao pagou.
 *
 * Depois de pago, le o Mapa completo:
 * - o dono logado (veio pelo link do e-mail/WhatsApp, ou pela Biblioteca);
 * - o aparelho que gerou (cookie), sem login — e quem volta do checkout.
 */

export type Leitor = {
  userId: string | null
  dispositivoHash: string | null
}

export async function identificarLeitor(request: NextRequest): Promise<Leitor> {
  const session = await auth()
  const segredo = request.cookies.get(COOKIE_DISPOSITIVO)?.value
  return {
    userId: session?.user?.id ?? null,
    dispositivoHash: segredo ? hashDe(segredo) : null
  }
}

export function podeLerCompleto(mapa: MapaOrigem, leitor: Leitor): boolean {
  if (!mapa.paidAt || mapa.status !== 'pronto') return false
  if (leitor.userId && mapa.userId === leitor.userId) return true
  return !!leitor.dispositivoHash && mapa.dispositivoHash === leitor.dispositivoHash
}

function tituloDoSintoma(mapa: MapaOrigem): string {
  const capa = (mapa.conteudo as { capa?: { sintoma_titulo?: string } } | null)?.capa
  return capa?.sintoma_titulo || mapa.sintoma
}

/** Checkout com o token no link — e por ele que o pagamento acha o Mapa. */
export function checkoutComToken(token: string): string {
  const url = new URL(checkoutMapaUrl())
  // Dois nomes porque ainda nao se sabe qual a Guru repassa a Stone (Story
  // 7.0). O webhook procura o token no payload inteiro, entao basta um voltar.
  url.searchParams.set('src', token)
  url.searchParams.set('utm_content', token)
  return url.toString()
}

export type VisaoMapa = {
  token: string
  status: 'gerando' | 'pronto' | 'erro'
  nome: string
  sintoma: string
  sintomaTitulo: string
  criadoEm: string
  pago: boolean
  /** So quando `podeLerCompleto`. */
  conteudo: unknown | null
  /** O leitor e o dono logado (mostra "Ver na Biblioteca"). */
  ehDono: boolean
  podeTentarDeNovo: boolean
  checkoutUrl: string | null
  preco: string
  /** Logado com credito de pagamento sem Mapa: pode liberar este. */
  podeResgatar: boolean
  /** "m***@gmail.com" — para o "enviei uma copia pro..." da entrega. */
  emailEntrega: string | null
}

function mascararEmail(email: string): string {
  const [local, dominio] = email.split('@')
  if (!dominio) return email
  return `${local.slice(0, 1)}***@${dominio}`
}

export async function montarVisao(mapa: MapaOrigem, leitor: Leitor): Promise<VisaoMapa> {
  const completo = podeLerCompleto(mapa, leitor)
  const pago = !!mapa.paidAt

  const podeResgatar =
    !pago && mapa.status === 'pronto' && !!leitor.userId
      ? (await prisma.mapaCredito.count({
          where: { userId: leitor.userId, usadoEm: null }
        })) > 0
      : false

  return {
    token: mapa.publicToken,
    status: mapa.status as VisaoMapa['status'],
    nome: mapa.nome,
    sintoma: mapa.sintoma,
    sintomaTitulo: tituloDoSintoma(mapa),
    criadoEm: mapa.createdAt.toISOString(),
    pago,
    conteudo: completo ? mapa.conteudo : null,
    ehDono: !!leitor.userId && mapa.userId === leitor.userId,
    podeTentarDeNovo: mapa.status === 'erro',
    checkoutUrl: !pago && mapa.status === 'pronto' ? checkoutComToken(mapa.publicToken) : null,
    preco: precoMapaExibido(),
    podeResgatar,
    emailEntrega: completo && mapa.userId ? await emailDoDono(mapa.userId) : null
  }
}

async function emailDoDono(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return user?.email ? mascararEmail(user.email) : null
}

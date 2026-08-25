import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Link de primeiro acesso: um clique e a pessoa esta dentro, sem digitar senha.
 *
 * Substitui a senha temporaria em texto que hoje vai no WhatsApp e no e-mail.
 * Credencial em URL vaza por varios lados (historico, log de servidor, header
 * Referer, preview do link no WhatsApp); um token de uso unico com validade nao
 * carrega a senha e morre depois de usado.
 *
 * Reaproveita `VerificationToken`, que ja existe no schema. O `identifier` leva o
 * prefixo `access-link:` para nao se misturar com os tokens de confirmacao de
 * cadastro, que usam o e-mail puro como identifier.
 */

const IDENTIFIER_PREFIX = 'access-link:'

/**
 * Sete dias. O link viaja por WhatsApp e e-mail, onde as pessoas respondem
 * devagar — expirar em horas transformaria o link em ticket de suporte.
 */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function identifierFor(userId: string): string {
  return `${IDENTIFIER_PREFIX}${userId}`
}

function resolveBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mediz.app'
  )
}

export type AccessLink = {
  token: string
  url: string
  expiresAt: Date
}

/**
 * Cria um link novo para o usuario. Nao invalida os anteriores de proposito: se a
 * pessoa recebeu o acesso por e-mail e por WhatsApp, os dois links precisam
 * funcionar ate que um deles seja usado.
 */
export async function createAccessLink(
  userId: string,
  options?: { ttlMs?: number; redirectTo?: string }
): Promise<AccessLink> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + (options?.ttlMs ?? DEFAULT_TTL_MS))

  await prisma.verificationToken.create({
    data: {
      identifier: identifierFor(userId),
      token,
      expires: expiresAt
    }
  })

  const url = new URL('/acesso', resolveBaseUrl())
  url.searchParams.set('token', token)
  if (options?.redirectTo) {
    url.searchParams.set('next', options.redirectTo)
  }

  return { token, url: url.toString(), expiresAt }
}

/**
 * Valida o token e devolve o id do usuario. Nao apaga nada.
 *
 * O delete morava aqui e acontecia antes de existir sessao. Qualquer tropeco
 * depois dele — o segundo pedido de uma corrida, uma falha de rede na volta, o
 * cookie que nao vingou no navegador embutido do app de e-mail — deixava a pessoa
 * de fora com o link ja destruido. Nas 48h anteriores a esta mudanca, seis
 * compradores ficaram nesse estado: token consumido, `firstAccessAt` nulo.
 *
 * O mesmo token sai por WhatsApp e por e-mail. Com uso unico na leitura, os dois
 * canais disputavam: o primeiro a ser tocado vencia e o outro virava tela de link
 * morto. Agora os dois funcionam ate a pessoa entrar de verdade.
 *
 * Quem queima e `burnAccessLinks`, chamado quando o app registra o primeiro
 * acesso. Ate la vale a validade de sete dias.
 */
export async function validateAccessLink(
  token: string
): Promise<{ userId: string } | null> {
  const trimmed = token?.trim()
  if (!trimmed) return null

  try {
    const record = await prisma.verificationToken.findUnique({
      where: { token: trimmed }
    })

    if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) {
      return null
    }

    const userId = record.identifier.slice(IDENTIFIER_PREFIX.length)

    // Expirado morre na hora: a tela de "link nao vale mais" passa a ser verdade
    // so nos dois casos que a justificam — ja entrou, ou passou da validade.
    if (record.expires.getTime() < Date.now()) {
      await prisma.verificationToken
        .delete({ where: { token: trimmed } })
        .catch(() => undefined)
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })
    if (!user) return null

    return { userId: user.id }
  } catch (error) {
    logger.error(
      'Falha ao validar link de acesso',
      error instanceof Error ? error : undefined,
      '[auth/access-link]'
    )
    return null
  }
}

/**
 * Queima os links de acesso da pessoa — chamado quando o app registra o primeiro
 * acesso dela, que e a prova de que a sessao vingou e a biblioteca carregou.
 *
 * Apaga todos os links do usuario, e nao so o que foi clicado: duas compras
 * seguidas geram dois links, e depois de entrar nenhum dos dois precisa continuar
 * de pe.
 *
 * Nunca lanca. Falhar aqui deixa um link vivo ate expirar, o que e bem menos
 * grave do que derrubar o primeiro acesso de quem acabou de comprar.
 */
export async function burnAccessLinks(userId: string): Promise<void> {
  try {
    await prisma.verificationToken.deleteMany({
      where: { identifier: identifierFor(userId) }
    })
  } catch (error) {
    logger.error(
      'Falha ao queimar links de acesso apos o primeiro acesso',
      error instanceof Error ? error : undefined,
      '[auth/access-link]'
    )
  }
}

import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { normalizeLibraryEmail } from '@/lib/library/email'

export const DEFAULT_SEQUENCE_LANG = 'pt-BR'

const CURRENCY_LANG: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en',
  EUR: 'en',
  GBP: 'en',
  MXN: 'es',
  ARS: 'es',
  COP: 'es',
  CLP: 'es',
  PEN: 'es',
  UYU: 'es'
}

const COUNTRY_LANG: Record<string, string> = {
  BR: 'pt-BR',
  PT: 'pt-BR',
  US: 'en',
  GB: 'en',
  CA: 'en',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  UY: 'es'
}

/**
 * Idioma da esteira para um comprador, resolvido no momento da compra e congelado
 * na inscricao — se a regra mudar depois, quem ja esta na esteira nao troca de
 * idioma no meio da sequencia.
 *
 * O pais tem precedencia sobre a moeda: a moeda diz onde a oferta foi cobrada,
 * o pais diz de onde a pessoa e.
 */
export function resolveBuyerLanguage(input: {
  currency?: string | null
  country?: string | null
}): string {
  const country = input.country?.trim().toUpperCase()
  if (country && COUNTRY_LANG[country]) return COUNTRY_LANG[country]

  const currency = input.currency?.trim().toUpperCase()
  if (currency && CURRENCY_LANG[currency]) return CURRENCY_LANG[currency]

  return DEFAULT_SEQUENCE_LANG
}

export type EnrollEmailSequenceResult = {
  enrolled: boolean
  lang: string
  reason?: 'already_enrolled' | 'already_active'
}

/**
 * Inscreve o comprador do livro na esteira de e-mails pos-compra (ondas 2 a 6).
 *
 * anchorAt e o relogio de toda a sequencia e deve ser o mesmo instante do inicio do
 * trial — os e-mails 4 e 5 anunciam o fim dos 7 dias, entao os dois relogios
 * precisam bater.
 *
 * Nunca lanca: a esteira e acessoria, nao pode derrubar a liberacao de acesso.
 */
export async function enrollInEmailSequence(input: {
  userId: string
  email: string
  name?: string | null
  source: 'hotmart' | 'stone' | 'manual'
  externalTransactionId: string
  currency?: string | null
  country?: string | null
  anchorAt?: Date
}): Promise<EnrollEmailSequenceResult> {
  const lang = resolveBuyerLanguage({
    currency: input.currency,
    country: input.country
  })

  try {
    const email = normalizeLibraryEmail(input.email)

    // Uma compra nova de quem ja esta recebendo a sequencia nao abre uma segunda:
    // a pessoa receberia dois e-mails iguais em dias diferentes.
    const active = await prisma.emailSequenceEnrollment.findFirst({
      where: { userId: input.userId, status: 'active' },
      select: { id: true }
    })

    if (active) {
      return { enrolled: false, lang, reason: 'already_active' }
    }

    await prisma.emailSequenceEnrollment.create({
      data: {
        userId: input.userId,
        email,
        name: input.name?.trim() || null,
        lang,
        source: input.source,
        externalTransactionId: input.externalTransactionId,
        anchorAt: input.anchorAt ?? new Date(),
        unsubscribeToken: randomUUID()
      }
    })

    // Aproveita o idioma resolvido para o app inteiro, sem sobrescrever uma
    // preferencia que o usuario ja tenha definido.
    await prisma.user.updateMany({
      where: { id: input.userId, preferredLanguage: null },
      data: { preferredLanguage: lang }
    })

    return { enrolled: true, lang }
  } catch (error) {
    // P2002 = unique (user_id, external_transaction_id): reentrega de webhook.
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { enrolled: false, lang, reason: 'already_enrolled' }
    }

    logger.error(
      'Falha ao inscrever comprador na esteira de e-mails',
      error instanceof Error ? error : undefined,
      '[purchases/email-sequence]'
    )
    return { enrolled: false, lang }
  }
}

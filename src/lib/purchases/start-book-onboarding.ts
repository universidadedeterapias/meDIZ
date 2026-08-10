import { grantProfessionalTrial } from '@/lib/purchases/grant-professional-trial'
import { enrollInEmailSequence } from '@/lib/purchases/enroll-email-sequence'
import { logger } from '@/lib/logger'

/**
 * Onboarding que acompanha a compra do livro: os 7 dias de Plano Profissional
 * e a inscricao na esteira de e-mails.
 *
 * Existe para garantir que os dois compartilhem exatamente o mesmo instante de
 * inicio. Os e-mails 4 e 5 anunciam o fim dos 7 dias; se o relogio do trial e o da
 * esteira divergirem, o e-mail avisa o fim de um acesso que ainda nao acabou (ou
 * o contrario).
 *
 * Chamado so para compra de livro — quem compra uma audioterapia avulsa nao entra
 * numa sequencia que fala do livro o tempo todo.
 *
 * Nunca lanca: as duas etapas ja engolem os proprios erros.
 */
export async function startBookOnboarding(input: {
  userId: string
  email: string
  name?: string | null
  source: 'hotmart' | 'stone' | 'manual'
  externalTransactionId: string
  currency?: string | null
  country?: string | null
}) {
  const anchorAt = new Date()

  const trial = await grantProfessionalTrial({
    userId: input.userId,
    externalTransactionId: input.externalTransactionId,
    source: input.source,
    startedAt: anchorAt
  })

  const enrollment = await enrollInEmailSequence({
    userId: input.userId,
    email: input.email,
    name: input.name,
    source: input.source,
    externalTransactionId: input.externalTransactionId,
    currency: input.currency,
    country: input.country,
    anchorAt
  })

  logger.info(
    `Onboarding do livro: trial=${trial.granted ? 'concedido' : (trial.reason ?? 'falhou')} esteira=${enrollment.enrolled ? enrollment.lang : (enrollment.reason ?? 'falhou')}`,
    '[purchases/onboarding]'
  )

  return { anchorAt, trial, enrollment }
}

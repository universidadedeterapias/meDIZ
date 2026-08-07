import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * Chave de negocio do plano criado na migration 20260806120100.
 * A busca e por stripePriceId, e nao pelo uuid, para o codigo sobreviver a uma
 * eventual recriacao da linha.
 */
export const TRIAL_PLAN_PRICE_ID = 'trial_profissional_7d'

export const TRIAL_DURATION_DAYS = 7

/** Status de assinatura que significam "ja tem acesso pago" — ver premiumUtils. */
const PAID_STATUSES = ['active', 'past_due', 'cancel_at_period_end', 'paused']

export type GrantProfessionalTrialResult = {
  granted: boolean
  /** Preenchido quando granted = true. Serve de ancora para a esteira de e-mails. */
  endsAt: Date | null
  reason?: 'plan_missing' | 'already_subscribed' | 'already_granted'
}

/**
 * Concede os 7 dias de Plano Profissional que acompanham a compra do livro.
 *
 * Cria uma Subscription com status 'trialing', que o premiumUtils ja reconhece como
 * premium — nao precisa de nenhuma mudanca no calculo de entitlement.
 *
 * Idempotente pelo unique de stripeSubscriptionId: reentrega de webhook nao gera
 * um segundo trial nem estende o prazo.
 *
 * Nunca lanca: a falha aqui nao pode derrubar a liberacao de acesso do comprador.
 */
export async function grantProfessionalTrial(input: {
  userId: string
  externalTransactionId: string
  source: 'hotmart' | 'stone' | 'manual'
  /** Inicio do trial. Default: agora. E o mesmo instante usado como ancora da esteira. */
  startedAt?: Date
}): Promise<GrantProfessionalTrialResult> {
  const syntheticId = `trial_${input.source}_${input.externalTransactionId}`

  try {
    const plan = await prisma.plan.findUnique({
      where: { stripePriceId: TRIAL_PLAN_PRICE_ID },
      select: { id: true }
    })

    if (!plan) {
      logger.warn(
        `Plano de trial '${TRIAL_PLAN_PRICE_ID}' nao encontrado — migration 20260806120100 aplicada?`,
        '[purchases/trial]'
      )
      return { granted: false, endsAt: null, reason: 'plan_missing' }
    }

    // Quem ja paga nao ganha trial: sobrescreveria uma assinatura melhor por uma
    // de 7 dias, e a esteira mandaria e-mails de oferta para um cliente ativo.
    const paid = await prisma.subscription.findFirst({
      where: { userId: input.userId, status: { in: PAID_STATUSES } },
      select: { id: true }
    })

    if (paid) {
      return { granted: false, endsAt: null, reason: 'already_subscribed' }
    }

    const startsAt = input.startedAt ?? new Date()
    const endsAt = new Date(
      startsAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
    )

    await prisma.subscription.create({
      data: {
        userId: input.userId,
        planId: plan.id,
        stripeSubscriptionId: syntheticId,
        status: 'trialing',
        currentPeriodStart: startsAt,
        currentPeriodEnd: endsAt
      }
    })

    return { granted: true, endsAt }
  } catch (error) {
    // P2002 = unique violation: o trial desta transacao ja existe.
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return { granted: false, endsAt: null, reason: 'already_granted' }
    }

    logger.error(
      'Falha ao conceder trial do Profissional',
      error instanceof Error ? error : undefined,
      '[purchases/trial]'
    )
    return { granted: false, endsAt: null }
  }
}

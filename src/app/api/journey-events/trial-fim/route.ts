import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { montarTelefone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem perguntar quem esta devendo um aviso de fim do trial de 7 dias do
 * Profissional (combinado com o Paulo, 13/09/2026, e revisado com o Edgar em
 * 24/09/2026).
 *
 * Ancora e `Subscription.currentPeriodStart/End` do trial (`trial_profissional_7d`,
 * ver TRIAL_PLAN_PRICE_ID em grant-professional-trial.ts) — e nao o `trial_inicio`
 * do corredor de conversao. O Paulo descreve a ancora como "data da entrega do
 * acesso", que e o instante da compra (quando a conta e criada e o trial e
 * concedido), nao o primeiro login: quem nunca abriu o app tem o mesmo relogio de
 * 7 dias rodando e precisa do mesmo aviso.
 *
 * Dois toques, um dia cada, sem sistema de horas como os Despertadores:
 * - Toque 1 (dia 6): ultimo dia antes do trial acabar, janela da manha.
 * - Dia 7: silencio proposital (ultimo dia liberado) — nao existe toque 2 aqui.
 * - Toque 2 (dia 8): um dia depois do trial ter acabado, as 7h.
 *
 * Os dois so valem para quem NAO assinou de verdade — uma segunda `Subscription`
 * (qualquer status) alem do trial sintetico ja conta como "assinou", mesmo que
 * tenha cancelado depois: quem tentou assinar nao e o publico do aviso.
 *
 * Reaproveita a mesma tabela de log dos Despertadores (`journey_wakeup_touches`,
 * sistema = 'trial_fim') e o mesmo endpoint de gravar toque
 * (`/despertadores/toques`) — a forma (userId, sistema, toque, conversationId,
 * template) e identica, so muda o valor de `sistema`.
 */

const corpo = z.object({
  limite: z.number().int().min(1).max(500).optional().default(200)
})

/**
 * Corte de lancamento (decisao do Edgar, 24/09/2026): so entra quem teve o
 * trial concedido a partir de hoje. Mesma licao dos Despertadores — sem um
 * corte, ligar o envio pela primeira vez dispara o toque 2 de uma vez para
 * toda a base de trials que ja venceu desde que a feature de trial existe.
 */
const CORTE_LANCAMENTO = new Date('2026-09-24T00:00:00-03:00')

type LinhaTrialFim = {
  user_id: string
  nome: string | null
  email: string
  whatsapp: string | null
  fim_trial: Date
}

function formataCandidato(l: LinhaTrialFim, toque: number) {
  const primeiroNome = (l.nome || '').trim().split(/\s+/)[0] || 'tudo bem'
  return {
    userId: l.user_id,
    email: l.email,
    primeiroNome,
    // null quando o numero que temos nao tem cara de telefone (ver
    // reativacao_telefone_sem_ddi): quem consome trata como "sem WhatsApp".
    whatsapp: montarTelefone({ numero: l.whatsapp }),
    fimTrialEm: l.fim_trial.toISOString(),
    toque
  }
}

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Parametros invalidos.' },
      { status: 400 }
    )
  }

  try {
    // Toque 1 · dia 6 — falta menos de 1 dia para o trial acabar, ainda nao
    // acabou. Janela da manha (7h-11h Brasilia), como o Paulo pediu.
    const dia6 = await prisma.$queryRaw<LinhaTrialFim[]>(Prisma.sql`
      SELECT u.id AS user_id, u.name AS nome, u.email, u.whatsapp,
             s."currentPeriodEnd" AS fim_trial
        FROM "Subscription" s
        JOIN "Plan" p ON p.id = s."planId"
        JOIN "User" u ON u.id = s."userId"
       WHERE p."stripePriceId" = 'trial_profissional_7d'
         AND s.status = 'trialing'
         AND s."currentPeriodStart" >= ${CORTE_LANCAMENTO}
         AND s."currentPeriodEnd" > now()
         AND s."currentPeriodEnd" <= now() + INTERVAL '1 day'
         AND NOT EXISTS (
           SELECT 1 FROM "Subscription" s2 WHERE s2."userId" = s."userId" AND s2.id <> s.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM journey_wakeup_touches t
            WHERE t.user_id = u.id AND t.sistema = 'trial_fim' AND t.toque = 1
         )
         AND extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo')) BETWEEN 7 AND 11
       ORDER BY s."currentPeriodEnd" ASC
       LIMIT ${parsed.data.limite}
    `)

    // Toque 2 · dia 8 — o trial ja acabou ha pelo menos 1 dia. Perto das 7h,
    // com folga ate as 9h para o job atrasar sem perder o dia.
    const dia8 = await prisma.$queryRaw<LinhaTrialFim[]>(Prisma.sql`
      SELECT u.id AS user_id, u.name AS nome, u.email, u.whatsapp,
             s."currentPeriodEnd" AS fim_trial
        FROM "Subscription" s
        JOIN "Plan" p ON p.id = s."planId"
        JOIN "User" u ON u.id = s."userId"
       WHERE p."stripePriceId" = 'trial_profissional_7d'
         AND s.status = 'trialing'
         AND s."currentPeriodStart" >= ${CORTE_LANCAMENTO}
         AND s."currentPeriodEnd" <= now() - INTERVAL '1 day'
         AND NOT EXISTS (
           SELECT 1 FROM "Subscription" s2 WHERE s2."userId" = s."userId" AND s2.id <> s.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM journey_wakeup_touches t
            WHERE t.user_id = u.id AND t.sistema = 'trial_fim' AND t.toque = 2
         )
         AND extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo')) BETWEEN 7 AND 9
       ORDER BY s."currentPeriodEnd" ASC
       LIMIT ${parsed.data.limite}
    `)

    const candidatosDia6 = dia6.map((l) => formataCandidato(l, 1))
    const candidatosDia8 = dia8.map((l) => formataCandidato(l, 2))

    return NextResponse.json({
      status: 'ok',
      dia6: { total: candidatosDia6.length, candidatos: candidatosDia6 },
      dia8: { total: candidatosDia8.length, candidatos: candidatosDia8 }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao consultar candidatos.', detalhe: msg },
      { status: 500 }
    )
  }
}

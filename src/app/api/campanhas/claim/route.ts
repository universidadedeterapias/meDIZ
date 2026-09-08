import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem buscar quem ainda nao recebeu a isca da onda.
 *
 * Puxar, e nao receber: enviar no meio de um request do admin morre com o
 * request, e onda pela metade nao se retoma sozinha. O mesmo desenho de
 * /api/journey-events/claim.
 *
 * Reivindicar e diferente de ler: a linha sai daqui como `enviando`, com
 * `claim_em` e `tentativas` incrementados na mesma transacao do SELECT. Sem
 * isso, duas execucoes simultaneas mandariam WhatsApp duas vezes para a mesma
 * pessoa — que aqui nao e um log duplicado, e um cliente irritado.
 *
 * Uma onda por vez, por regra do plano: a consulta pega a campanha ativa mais
 * antiga e ignora as outras. Seis ondas em paralelo e o jeito mais rapido de
 * queimar o numero.
 *
 * O teto diario e a janela de horario moram aqui, e nao na disciplina de quem
 * aperta o botao.
 *
 * O link devolvido e /r/<token>, e nao o link de acesso: o token de acesso e
 * gerado no clique, dentro do /r. Assim a validade de sete dias comeca quando a
 * pessoa clica — numa onda que leva uma semana para escoar, gerar na largada
 * entregaria link vencido — e o token real nao viaja na previa do WhatsApp.
 */

const corpo = z.object({
  limite: z.number().int().min(1).max(200).optional().default(50)
})

type Reivindicado = {
  id: string
  campaign_id: string
  user_id: string
  email: string
  nome: string | null
  telefone: string | null
  idioma: string | null
  estado: string
  track_token: string
  tentativas: number
  template_name: string
  template_lang: string
  crm_scenario_id: string | null
  crm_step_id: string | null
  campanha_nome: string
}

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mediz.app'
  )
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
    // Quem falhou tres vezes nao volta para a fila. Nao e instabilidade: e
    // telefone que a Meta recusa, ou template que nao existe. Continuar
    // tentando esconderia a fila real atras do mesmo erro.
    await prisma.reactivationRecipient.updateMany({
      where: {
        status: 'enviando',
        tentativas: { gte: 3 },
        claimEm: { lte: new Date(Date.now() - 15 * 60_000) }
      },
      data: { status: 'falhou', motivo: 'número máximo de tentativas excedido' }
    })

    const linhas = await prisma.$queryRaw<Reivindicado[]>(Prisma.sql`
      WITH onda AS (
        SELECT c.id, c.teto_diario, c.template_name, c.template_lang,
               c.crm_scenario_id, c.crm_step_id, c.nome,
               (SELECT count(*) FROM reactivation_recipients h
                 WHERE h.campaign_id = c.id
                   AND (h.enviado_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')
                        OR (h.status = 'enviando'
                            AND h.claim_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')))
               ) AS ja_hoje
          FROM reactivation_campaigns c
         WHERE c.status = 'ativa'
           AND extract(hour from (now() AT TIME ZONE 'America/Sao_Paulo'))
               BETWEEN c.hora_inicio AND c.hora_fim
         ORDER BY c.criado_em ASC
         LIMIT 1
      ),
      candidatos AS (
        SELECT r.id
          FROM reactivation_recipients r
          JOIN onda o ON o.id = r.campaign_id
         WHERE r.status = 'pendente'
           AND (r.claim_em IS NULL OR r.claim_em < now() - INTERVAL '15 minutes')
           AND o.ja_hoje < o.teto_diario
         ORDER BY r.criado_em ASC
         LIMIT LEAST(
           ${parsed.data.limite}::int,
           GREATEST((SELECT teto_diario - ja_hoje FROM onda), 0)
         )
         FOR UPDATE OF r SKIP LOCKED
      )
      UPDATE reactivation_recipients AS r
         SET status = 'enviando',
             claim_em = now(),
             tentativas = r.tentativas + 1,
             atualizado_em = now()
        FROM candidatos c, onda o
       WHERE r.id = c.id
      RETURNING r.id, r.campaign_id, r.user_id, r.email, r.nome, r.telefone,
                r.idioma, r.estado, r.track_token, r.tentativas,
                o.template_name, o.template_lang, o.crm_scenario_id,
                o.crm_step_id, o.nome AS campanha_nome
    `)

    const base = baseUrl()

    return NextResponse.json({
      status: 'ok',
      total: linhas.length,
      itens: linhas.map((l) => ({
        destinatarioId: l.id,
        campanhaId: l.campaign_id,
        campanha: l.campanha_nome,
        userId: l.user_id,
        email: l.email,
        // Primeiro nome: e assim que a isca chama a pessoa, e o template so tem
        // espaco para um.
        primeiroNome: (l.nome || '').trim().split(/\s+/)[0] || 'tudo bem',
        telefone: l.telefone,
        idioma: l.idioma,
        estado: l.estado,
        tentativa: l.tentativas,
        templateName: l.template_name,
        templateLang: l.template_lang,
        crmScenarioId: l.crm_scenario_id,
        crmStepId: l.crm_step_id,
        link: `${base}/r/${l.track_token}`,
        // O botao de URL do template tem base fixa na Meta e so concatena o que
        // vai no valor. Entao o n8n precisa do token puro, e nao da URL inteira:
        // mandar o link completo produziria mediz.app/r/https://mediz.app/r/...
        token: l.track_token
      }))
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao reivindicar.', detalhe: msg },
      { status: 500 }
    )
  }
}

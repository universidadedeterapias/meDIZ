import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import {
  BOTAO_PADRAO,
  MAPEAMENTO_PADRAO,
  ROTULO_ESTADO,
  type Estado,
  type MapeamentoBotao,
  type MapeamentoVariavel
} from '@/lib/reativacao/tipos'

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
  variaveis: unknown
  botao: unknown
}

/**
 * Resolve os {{1}}, {{2}} do template com os dados de quem vai receber.
 *
 * Acontece aqui, e nao no n8n, porque so o app conhece o destinatario — e
 * porque template novo nao pode exigir editar fluxo. O n8n recebe
 * { var_1: 'Maria', var_2: '...' } pronto e so repassa.
 */
function resolverVariaveis(
  mapa: MapeamentoVariavel[],
  lead: { nome: string | null; email: string; estado: string; idioma: string | null },
  primeiroNome: string
): Record<string, string> {
  const fora: Record<string, string> = {}
  for (const m of mapa) {
    let valor = ''
    if (m.fonte === 'primeiro_nome') valor = primeiroNome
    else if (m.fonte === 'nome_completo') valor = (lead.nome || '').trim()
    else if (m.fonte === 'email') valor = lead.email
    else if (m.fonte === 'estado') valor = ROTULO_ESTADO[lead.estado as Estado] ?? lead.estado
    else if (m.fonte === 'idioma') valor = lead.idioma || ''
    else if (m.fonte === 'literal') valor = m.valor || ''
    fora[`var_${m.posicao}`] = valor
  }
  return fora
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
               c.crm_scenario_id, c.crm_step_id, c.nome, c.variaveis, c.botao,
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
                o.crm_step_id, o.nome AS campanha_nome, o.variaveis, o.botao
    `)

    const base = baseUrl()

    return NextResponse.json({
      status: 'ok',
      total: linhas.length,
      itens: linhas.map((l) => {
        const primeiroNome = (l.nome || '').trim().split(/\s+/)[0] || 'tudo bem'

        // Onda criada antes de o mapeamento existir cai no padrao, que e
        // exatamente o que o n8n tinha fixo no codigo: var_1 = primeiro nome,
        // botao com o token.
        const mapa = Array.isArray(l.variaveis)
          ? (l.variaveis as MapeamentoVariavel[])
          : MAPEAMENTO_PADRAO
        const botao =
          l.botao === null
            ? null
            : ((l.botao as MapeamentoBotao) ?? BOTAO_PADRAO)

        return {
          destinatarioId: l.id,
          campanhaId: l.campaign_id,
          campanha: l.campanha_nome,
          userId: l.user_id,
          email: l.email,
          primeiroNome,
          telefone: l.telefone,
          idioma: l.idioma,
          estado: l.estado,
          tentativa: l.tentativas,
          templateName: l.template_name,
          templateLang: l.template_lang,
          crmScenarioId: l.crm_scenario_id,
          crmStepId: l.crm_step_id,
          link: `${base}/r/${l.track_token}`,
          // O botao de URL do template tem base fixa na Meta e so concatena o
          // que vai no valor. Entao vai o token puro, e nao a URL inteira:
          // mandar o link completo produziria mediz.app/r/https://mediz.app/r/…
          token: l.track_token,
          // Ja resolvidas: { var_1: 'Maria', var_2: 'O CORPO DIZ' }. O n8n so
          // espalha isto no corpo do template.
          variaveis: resolverVariaveis(mapa, l, primeiroNome),
          // Pronto no formato que a Chatvolt espera, ou null quando o template
          // nao tem botao.
          botoes: botao ? [{ type: 'url', value: l.track_token, index: 0 }] : null
        }
      })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao reivindicar.', detalhe: msg },
      { status: 500 }
    )
  }
}

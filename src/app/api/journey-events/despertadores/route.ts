import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { montarTelefone } from '@/lib/phone'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem perguntar quem esta devendo um toque das reguas de 48h ("Os Dois
 * Despertadores": doc do Paulo, 11/09/2026).
 *
 * Sistema 1 · Acordar o Acesso — recebeu o aviso de acesso e nunca entrou no
 * app. Sistema 2 · Acordar a Pesquisa — ja entrou, mas nunca fez uma pesquisa.
 * Populacoes mutuamente exclusivas: quem tem `trial_inicio` sai do Sistema 1 e
 * so entao pode entrar no Sistema 2.
 *
 * Ao contrario de /api/journey-events/claim e /api/campanhas/claim, este
 * endpoint NAO reivindica nada — e leitura pura, sem trava, chamavel quantas
 * vezes o n8n quiser. "Ja mandei esse toque?" responde sozinho, cruzando com
 * `journey_wakeup_touches`: o maior `toque` ja registrado pra aquele
 * user+sistema E o contador da regua. Nao precisa de tag no Chatvolt pra isso
 * (ideia descartada em 12/09/2026 assim que a tabela ficou pronta) — tag la so
 * faria sentido como espelho visual pro atendimento, nunca como fonte de
 * verdade.
 *
 * Cobertura ainda parcial: a saida por CONVERSA viva (resposta congela o
 * Sistema 2 e depois retoma de onde parou, se silenciar de novo) nao da pra
 * derivar so daqui — precisa saber se a conversa segue ativa agora, nao so que
 * ela respondeu uma vez. Sistema 1 esta completo (qualquer `respondido` mata a
 * regua, ver NOT EXISTS abaixo).
 */

const corpo = z.object({
  limite: z.number().int().min(1).max(500).optional().default(200)
})

/** Em horas desde a ancora de cada sistema — bate com o doc, nao inventar. */
const LIMIARES_SISTEMA1 = [2, 12, 24, 48] as const
const LIMIARES_SISTEMA2 = [6, 12, 24, 48] as const

/** Ate onde o tempo decorrido ja autoriza avancar, ignorando o que ja foi enviado. */
function toquePermitidoPeloTempo(
  horas: number,
  limiares: readonly number[]
): number | null {
  let toque: number | null = null
  limiares.forEach((limiar, indice) => {
    if (horas >= limiar) toque = indice + 1
  })
  return toque
}

type LinhaSistema1 = {
  user_id: string
  nome: string | null
  email: string
  whatsapp: string | null
  produto: string | null
  ancora_em: Date
  horas: number
  ultimo_toque: number | null
}

type LinhaSistema2 = LinhaSistema1

/**
 * Cruza tempo decorrido com o que ja foi mandado (via `ultimo_toque`, vindo de
 * `journey_wakeup_touches`) e devolve o proximo toque a mandar — ou `null`
 * quando ainda nao chegou a hora, ou quando a regua ja esgotou os 4 toques.
 */
function proximoToqueDevido(
  horas: number,
  ultimoToque: number | null,
  limiares: readonly number[]
): number | null {
  const permitido = toquePermitidoPeloTempo(horas, limiares)
  if (permitido === null) return null

  const proximo = (ultimoToque ?? 0) + 1
  if (proximo > 4 || proximo > permitido) return null
  return proximo
}

function formataCandidato(l: LinhaSistema1 | LinhaSistema2, limiares: readonly number[]) {
  const primeiroNome = (l.nome || '').trim().split(/\s+/)[0] || 'tudo bem'
  return {
    userId: l.user_id,
    email: l.email,
    primeiroNome,
    // null quando o numero que temos nao tem cara de telefone (ver
    // reativacao_telefone_sem_ddi): quem consome trata como "sem WhatsApp",
    // nao descarta o candidato em silencio.
    whatsapp: montarTelefone({ numero: l.whatsapp }),
    produto: l.produto,
    ancoraEm: l.ancora_em.toISOString(),
    horasDesdeAncora: Math.round(l.horas * 10) / 10,
    toque: proximoToqueDevido(l.horas, l.ultimo_toque, limiares)
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
    // Sistema 1: aviso de acesso entregue, sem `trial_inicio` (nunca entrou).
    // A janela 7h-21h de Brasilia mora aqui, e nao no agendamento do n8n —
    // mesmo padrao de /api/campanhas/claim, pra nao depender do fuso horario
    // configurado na instancia do n8n.
    const sistema1 = await prisma.$queryRaw<LinhaSistema1[]>(Prisma.sql`
      SELECT u.id AS user_id, u.name AS nome, u.email, u.whatsapp,
             (SELECT uo.produto FROM user_origins uo
               WHERE uo.user_id = u.id
               ORDER BY uo.em DESC LIMIT 1) AS produto,
             u.access_message_at AS ancora_em,
             EXTRACT(EPOCH FROM (now() - u.access_message_at)) / 3600 AS horas,
             (SELECT MAX(t.toque) FROM journey_wakeup_touches t
               WHERE t.user_id = u.id AND t.sistema = 'acesso') AS ultimo_toque
        FROM "User" u
       WHERE u.access_message_at IS NOT NULL
         AND u.access_message_at <= now() - INTERVAL '2 hours'
         AND NOT EXISTS (
           SELECT 1 FROM journey_events je
            WHERE je.user_id = u.id AND je.event_name = 'trial_inicio'
         )
         -- Qualquer resposta mata a regua na hora (regra do doc). So pega quem
         -- ja tem toque registrado — resposta a uma mensagem anterior ao
         -- primeiro toque desta regua ainda nao tem onde pousar, ver
         -- /despertadores/respostas.
         AND NOT EXISTS (
           SELECT 1 FROM journey_wakeup_touches t
            WHERE t.user_id = u.id AND t.sistema = 'acesso' AND t.status = 'respondido'
         )
         AND extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo')) BETWEEN 7 AND 21
       ORDER BY u.access_message_at ASC
       LIMIT ${parsed.data.limite}
    `)

    // Sistema 2: entrou (`trial_inicio` existe) e nunca pesquisou
    // (`primeira_pesquisa` nao existe). Ancora e o instante do primeiro
    // acesso, nao a compra — e o que o doc chama de "6h sem pesquisa".
    const sistema2 = await prisma.$queryRaw<LinhaSistema2[]>(Prisma.sql`
      SELECT u.id AS user_id, u.name AS nome, u.email, u.whatsapp,
             (SELECT uo.produto FROM user_origins uo
               WHERE uo.user_id = u.id
               ORDER BY uo.em DESC LIMIT 1) AS produto,
             acesso.created_at AS ancora_em,
             EXTRACT(EPOCH FROM (now() - acesso.created_at)) / 3600 AS horas,
             (SELECT MAX(t.toque) FROM journey_wakeup_touches t
               WHERE t.user_id = u.id AND t.sistema = 'pesquisa') AS ultimo_toque
        FROM "User" u
        JOIN journey_events acesso
          ON acesso.user_id = u.id AND acesso.event_name = 'trial_inicio'
       WHERE acesso.created_at <= now() - INTERVAL '6 hours'
         AND NOT EXISTS (
           SELECT 1 FROM journey_events pesquisa
            WHERE pesquisa.user_id = u.id AND pesquisa.event_name = 'primeira_pesquisa'
         )
         AND extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo')) BETWEEN 7 AND 21
       ORDER BY acesso.created_at ASC
       LIMIT ${parsed.data.limite}
    `)

    // So sai daqui quem tem mesmo um toque devido agora — tempo decorrido
    // sozinho nao basta, precisa que `journey_wakeup_touches` ainda nao tenha
    // esse numero. `.toque === null` cobre tanto "ainda nao chegou a hora"
    // quanto "regua ja esgotou os 4 toques".
    const candidatosSistema1 = sistema1
      .map((l) => formataCandidato(l, LIMIARES_SISTEMA1))
      .filter((c) => c.toque !== null)

    const candidatosSistema2 = sistema2
      .map((l) => {
        const candidato = formataCandidato(l, LIMIARES_SISTEMA2)
        // Toque 3 (24h) prefere a janela das 21h por regra do doc — o campo
        // vai junto para quem for montar o gatilho de envio decidir se espera.
        return { ...candidato, prefereJanela21h: candidato.toque === 3 }
      })
      .filter((c) => c.toque !== null)

    return NextResponse.json({
      status: 'ok',
      sistema1: { total: candidatosSistema1.length, candidatos: candidatosSistema1 },
      sistema2: { total: candidatosSistema2.length, candidatos: candidatosSistema2 }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao consultar candidatos.', detalhe: msg },
      { status: 500 }
    )
  }
}

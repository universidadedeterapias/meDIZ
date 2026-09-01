import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem buscar os eventos de uso que ainda nao viraram variavel no Chatvolt.
 *
 * Puxar, e nao receber: gravar a variavel exige resolver a conversa a partir do
 * telefone, e essa resolucao e do n8n, que tem a credencial e o mapa dos dois
 * agentes espelhados. O app so precisa saber que o fato aconteceu.
 *
 * Reivindicar e diferente de ler: a linha sai daqui marcada como `processing` e
 * com `attempts` incrementado, dentro da mesma transacao do SELECT. Sem isso,
 * duas execucoes simultaneas do fluxo gravariam a mesma variavel duas vezes — e o
 * `FOR UPDATE SKIP LOCKED` e o que faz a segunda pegar as proximas em vez de
 * esperar as mesmas.
 *
 * Quem reivindica precisa responder em `/api/journey-events/result`. Quem nao
 * responde tem a linha devolvida para a fila depois de 10 minutos.
 */

const corpo = z.object({
  limite: z.number().int().min(1).max(50).optional().default(10)
})

type LinhaReivindicada = {
  id: string
  user_id: string
  event_name: string
  email: string
  whatsapp: string | null
  variables: Prisma.JsonValue
  attempts: number
  created_at: Date
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
    // Evento que falhou cinco vezes nao volta para a fila: o problema nao e
    // instabilidade, e um dado que nunca vai passar — telefone sem conversa,
    // variavel recusada. Continuar tentando esconderia a fila real atras dele.
    await prisma.journeyEvent.updateMany({
      where: {
        status: 'processing',
        attempts: { gte: 5 },
        updatedAt: { lte: new Date(Date.now() - 10 * 60_000) }
      },
      data: {
        status: 'failed',
        lastError: 'Numero maximo de tentativas excedido'
      }
    })

    const linhas = await prisma.$queryRaw<LinhaReivindicada[]>(Prisma.sql`
      WITH candidatos AS (
        SELECT "id"
        FROM "journey_events"
        WHERE (
            "status" IN ('pending', 'failed')
            OR (
              "status" = 'processing'
              AND "updated_at" <= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
            )
          )
          AND "available_at" <= CURRENT_TIMESTAMP
          AND "attempts" < 5
        ORDER BY "created_at" ASC
        LIMIT ${parsed.data.limite}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "journey_events" AS evento
      SET
        "status" = 'processing',
        "attempts" = evento."attempts" + 1,
        "updated_at" = CURRENT_TIMESTAMP
      FROM candidatos
      WHERE evento."id" = candidatos."id"
      RETURNING
        evento."id",
        evento."user_id",
        evento."event_name",
        evento."email",
        evento."whatsapp",
        evento."variables",
        evento."attempts",
        evento."created_at"
    `)

    return NextResponse.json({
      status: 'ok',
      eventos: linhas.map((linha) => ({
        evento_id: linha.id,
        usuario_id: linha.user_id,
        evento: linha.event_name,
        email: linha.email,
        whatsapp: linha.whatsapp,
        variaveis: linha.variables,
        tentativas: linha.attempts,
        criado_em: linha.created_at.toISOString()
      })),
      total: linhas.length
    })
  } catch (error) {
    console.error('[journey-events/claim]', error)
    return NextResponse.json(
      { status: 'erro', mensagem: 'Nao foi possivel ler a fila agora.' },
      { status: 500 }
    )
  }
}

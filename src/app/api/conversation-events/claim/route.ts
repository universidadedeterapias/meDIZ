import { validateWebhookBearer } from '@/lib/webhookAuth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const claimRequestSchema = z.object({
  limit: z.number().int().min(1).max(20).optional().default(5)
})

type ClaimedEvent = {
  id: string
  user_id: string
  session_id: string
  event_type: string
  schema_version: number
  trigger: string
  payload: Prisma.JsonValue
  attempts: number
  created_at: Date
}

/** Chamado pelo worker do ID Vida (Story 4.3, fora deste repo) para reivindicar checkpoints de conversa pendentes. */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'CONVERSATION_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedBody = claimRequestSchema.safeParse(await request.json().catch(() => ({})))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  await prisma.conversationEvent.updateMany({
    where: {
      status: 'processing',
      attempts: { gte: 5 },
      updatedAt: { lte: new Date(Date.now() - 10 * 60_000) }
    },
    data: {
      status: 'failed',
      lastError: 'Número máximo de tentativas excedido'
    }
  })

  const events = await prisma.$queryRaw<ClaimedEvent[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id"
      FROM "conversation_events"
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
      LIMIT ${parsedBody.data.limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "conversation_events" AS event
    SET
      "status" = 'processing',
      "attempts" = event."attempts" + 1,
      "updated_at" = CURRENT_TIMESTAMP
    FROM candidates
    WHERE event."id" = candidates."id"
    RETURNING
      event."id",
      event."user_id",
      event."session_id",
      event."event_type",
      event."schema_version",
      event."trigger",
      event."payload",
      event."attempts",
      event."created_at"
  `)

  return NextResponse.json({
    events: events.map((event) => ({
      eventId: event.id,
      userId: event.user_id,
      sessionId: event.session_id,
      eventType: event.event_type,
      schemaVersion: event.schema_version,
      trigger: event.trigger,
      payload: event.payload,
      attempts: event.attempts,
      createdAt: event.created_at.toISOString()
    }))
  })
}

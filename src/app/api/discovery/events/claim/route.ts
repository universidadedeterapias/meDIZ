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
  event_type: string
  schema_version: number
  payload: Prisma.JsonValue
  attempts: number
  created_at: Date
}

/** Chamado pelo worker n8n (Story 2.2) para reivindicar eventos de descoberta pendentes. */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'DISCOVERY_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedBody = claimRequestSchema.safeParse(await request.json().catch(() => ({})))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  await prisma.discoveryEvent.updateMany({
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
      FROM "discovery_events"
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
    UPDATE "discovery_events" AS event
    SET
      "status" = 'processing',
      "attempts" = event."attempts" + 1,
      "updated_at" = CURRENT_TIMESTAMP
    FROM candidates
    WHERE event."id" = candidates."id"
    RETURNING
      event."id",
      event."user_id",
      event."event_type",
      event."schema_version",
      event."payload",
      event."attempts",
      event."created_at"
  `)

  const profiles =
    events.length > 0
      ? await prisma.userProfile.findMany({
          where: { userId: { in: events.map((event) => event.user_id) } },
          select: {
            userId: true,
            usageContext: true,
            preferredStyle: true,
            core: true,
            dynamics: true,
            predictive: true,
            compactProfile: true,
            profileVersion: true
          }
        })
      : []
  const profilesByUserId = new Map(profiles.map((profile) => [profile.userId, profile]))

  return NextResponse.json({
    events: events.map((event) => ({
      eventId: event.id,
      userId: event.user_id,
      eventType: event.event_type,
      schemaVersion: event.schema_version,
      payload: event.payload,
      attempts: event.attempts,
      createdAt: event.created_at.toISOString(),
      currentProfile: profilesByUserId.get(event.user_id) ?? null
    }))
  })
}

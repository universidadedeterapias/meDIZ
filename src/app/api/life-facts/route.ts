import { validateWebhookBearer } from '@/lib/webhookAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/** Fios abertos sem menção há mais de N dias contam como "arquivados" na leitura (sem cron — ver Story 4.1 Dev Notes). */
const ONGOING_DECAY_DAYS = 45

/**
 * Chamado pelo worker de extração do ID Vida (Story 4.3, fora deste repo) para buscar o
 * contexto atual de fatos de um usuário antes de rodar a extração — sem isso o worker não
 * tem como saber o que já existe (dedupe de marcos, quais fios estão abertos).
 */
export async function GET(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'CONVERSATION_WEBHOOK_TOKEN')
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
  }

  const decayThreshold = new Date(Date.now() - ONGOING_DECAY_DAYS * 24 * 60 * 60 * 1000)

  const facts = await prisma.userFact.findMany({
    where: {
      userId,
      OR: [
        { type: 'marker' },
        { type: 'ongoing', status: { in: ['open', 'tracking'] }, lastMentionedAt: { gte: decayThreshold } },
        { type: 'ongoing', status: 'resolved' }
      ]
    },
    orderBy: [{ relevance: 'desc' }, { lastMentionedAt: 'desc' }]
  })

  return NextResponse.json({
    facts: facts.map((fact) => ({
      factId: fact.id,
      type: fact.type,
      fact: fact.fact,
      category: fact.category,
      status: fact.status,
      approach: fact.approach,
      sensitivity: fact.sensitivity,
      confidence: fact.confidence,
      relevance: fact.relevance,
      lastMentionedAt: fact.lastMentionedAt.toISOString(),
      resolvedAt: fact.resolvedAt?.toISOString() ?? null
    }))
  })
}

const newMarkerSchema = z.object({
  fact: z.string().trim().min(1).max(200),
  category: z.string().trim().max(50).optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.string().trim().max(300).optional()
})

const newOngoingSchema = z.object({
  fact: z.string().trim().min(1).max(200),
  category: z.string().trim().max(50).optional(),
  approach: z.enum(['ask', 'wait']).default('ask'),
  sensitivity: z.enum(['normal', 'high']).default('normal'),
  confidence: z.number().min(0).max(1),
  evidence: z.string().trim().max(300).optional()
})

const updateSchema = z.object({
  factId: z.string().uuid(),
  newStatus: z.enum(['tracking', 'resolved']),
  outcome: z.string().trim().max(200).optional(),
  promoteToMarker: z.boolean().optional().default(false)
})

const syncRequestSchema = z.object({
  eventId: z.string().uuid(),
  newMarkers: z.array(newMarkerSchema).max(20).optional().default([]),
  newOngoing: z.array(newOngoingSchema).max(20).optional().default([]),
  updates: z.array(updateSchema).max(20).optional().default([]),
  forget: z.array(z.string().uuid()).max(20).optional().default([]),
  lifeCompact: z.string().trim().max(1000).optional(),
  lastTopic: z.string().trim().max(200).optional()
})

const MIN_MARKER_CONFIDENCE = 0.8
const MIN_ONGOING_CONFIDENCE = 0.6

/**
 * Chamado pelo worker de extração do ID Vida (Story 4.3, fora deste repo) para gravar o
 * resultado do merge de fatos de uma fatia de conversa, e opcionalmente o lifeCompact já
 * condensado. Endpoint separado de /api/conversation-events/result de propósito — o result
 * genérico do outbox não assume nenhum schema de dados extraídos (ver Dev Notes da Story 4.1).
 */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'CONVERSATION_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedBody = syncRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Payload inválido', issues: parsedBody.error.flatten() }, { status: 400 })
  }

  const event = await prisma.conversationEvent.findUnique({
    where: { id: parsedBody.data.eventId },
    select: { userId: true }
  })
  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }
  const userId = event.userId
  const { newMarkers, newOngoing, updates, forget, lifeCompact, lastTopic } = parsedBody.data

  await prisma.$transaction(async (tx) => {
    for (const marker of newMarkers) {
      if (marker.confidence < MIN_MARKER_CONFIDENCE) continue

      const existing = await tx.userFact.findFirst({
        where: { userId, type: 'marker', fact: { equals: marker.fact, mode: 'insensitive' } }
      })
      if (existing) {
        await tx.userFact.update({
          where: { id: existing.id },
          data: {
            lastMentionedAt: new Date(),
            confidence: Math.max(existing.confidence ?? 0, marker.confidence)
          }
        })
        continue
      }

      await tx.userFact.create({
        data: {
          userId,
          type: 'marker',
          fact: marker.fact,
          category: marker.category,
          status: 'active',
          confidence: marker.confidence,
          evidence: marker.evidence
        }
      })
    }

    for (const ongoing of newOngoing) {
      if (ongoing.confidence < MIN_ONGOING_CONFIDENCE) continue

      await tx.userFact.create({
        data: {
          userId,
          type: 'ongoing',
          fact: ongoing.fact,
          category: ongoing.category,
          status: 'open',
          approach: ongoing.approach,
          sensitivity: ongoing.sensitivity,
          confidence: ongoing.confidence,
          evidence: ongoing.evidence
        }
      })
    }

    for (const update of updates) {
      const fact = await tx.userFact.findFirst({ where: { id: update.factId, userId } })
      if (!fact) continue

      await tx.userFact.update({
        where: { id: fact.id },
        data: {
          status: update.newStatus,
          lastMentionedAt: new Date(),
          resolvedAt: update.newStatus === 'resolved' ? new Date() : fact.resolvedAt
        }
      })

      if (update.newStatus === 'resolved' && update.promoteToMarker && update.outcome) {
        await tx.userFact.create({
          data: {
            userId,
            type: 'marker',
            fact: update.outcome,
            category: fact.category,
            status: 'active',
            confidence: fact.confidence ?? 0.8,
            evidence: update.outcome
          }
        })
      }
    }

    if (forget.length > 0) {
      await tx.userFact.deleteMany({ where: { id: { in: forget }, userId } })
    }

    if (lifeCompact !== undefined) {
      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, lifeCompact, lastConversationAt: new Date(), lastTopic },
        update: { lifeCompact, lastConversationAt: new Date(), lastTopic }
      })
    }
  })

  return NextResponse.json({ success: true })
}

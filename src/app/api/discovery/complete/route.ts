import { auth } from '@/auth'
import {
  discoveryCompletedEventSchema,
  discoveryTranscriptSchema,
  discoveryUsageSchema,
  getPredominantDiscoveryChannel
} from '@/lib/discovery'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const completeDiscoveryRequestSchema = z.object({
  eventId: z.string().uuid(),
  transcript: discoveryTranscriptSchema,
  totalDurationSeconds: z.number().finite().min(0).max(600),
  usage: discoveryUsageSchema.optional().default(null)
})

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const parsedBody = completeDiscoveryRequestSchema.safeParse(
    await request.json().catch(() => null)
  )

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Payload de conclusão inválido', issues: parsedBody.error.flatten() },
      { status: 400 }
    )
  }

  const eventId = parsedBody.data.eventId
  const completedAt = new Date()
  const event = discoveryCompletedEventSchema.parse({
    eventId,
    schemaVersion: 1,
    userId: session.user.id,
    source: 'discovery',
    completedAt: completedAt.toISOString(),
    predominantChannel: getPredominantDiscoveryChannel(parsedBody.data.transcript),
    totalDurationSeconds: parsedBody.data.totalDurationSeconds,
    transcript: parsedBody.data.transcript,
    usage: parsedBody.data.usage
  })

  await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        discoveryCompleted: true
      },
      update: {
        discoveryCompleted: true
      }
    }),
    prisma.discoveryEvent.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        userId: session.user.id,
        eventType: 'discovery.completed.v1',
        schemaVersion: 1,
        payload: event
      },
      update: {}
    })
  ])

  return NextResponse.json(
    {
      success: true,
      eventId,
      deliveryStatus: 'pending'
    },
    { status: 202 }
  )
}

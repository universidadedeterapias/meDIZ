import { validateWebhookBearer } from '@/lib/webhookAuth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const resultRequestSchema = z
  .object({
    eventId: z.string().uuid(),
    success: z.boolean(),
    error: z.string().trim().max(2000).optional(),
    profile: z
      .object({
        usageContext: z.enum(['personal', 'professional']).nullable(),
        preferredStyle: z.enum(['direct', 'supportive', 'balanced']).nullable(),
        core: z.record(z.string(), z.unknown()),
        dynamics: z.record(z.string(), z.unknown()),
        predictive: z.record(z.string(), z.unknown()),
        compactProfile: z.string().trim().min(1).max(5000),
        profileVersion: z.number().int().positive().default(1)
      })
      .optional()
  })
  .superRefine((value, context) => {
    if (value.success && !value.profile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['profile'],
        message: 'profile é obrigatório quando success=true'
      })
    }
  })

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Chamado pelo worker n8n (Story 2.2) para reportar o resultado da extracao de perfil. */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'DISCOVERY_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedBody = resultRequestSchema.safeParse(await request.json().catch(() => null))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Resultado inválido' }, { status: 400 })
  }

  const event = await prisma.discoveryEvent.findUnique({
    where: { id: parsedBody.data.eventId },
    select: { attempts: true, userId: true }
  })

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  const retryDelayMinutes = Math.min(60, 2 ** Math.max(0, event.attempts - 1))

  if (parsedBody.data.success && parsedBody.data.profile) {
    const profile = parsedBody.data.profile

    await prisma.$transaction([
      prisma.userProfile.upsert({
        where: { userId: event.userId },
        create: {
          userId: event.userId,
          discoveryCompleted: true,
          usageContext: profile.usageContext,
          preferredStyle: profile.preferredStyle,
          core: toInputJson(profile.core),
          dynamics: toInputJson(profile.dynamics),
          predictive: toInputJson(profile.predictive),
          compactProfile: profile.compactProfile,
          profileVersion: profile.profileVersion
        },
        update: {
          usageContext: profile.usageContext,
          preferredStyle: profile.preferredStyle,
          core: toInputJson(profile.core),
          dynamics: toInputJson(profile.dynamics),
          predictive: toInputJson(profile.predictive),
          compactProfile: profile.compactProfile,
          profileVersion: profile.profileVersion
        }
      }),
      prisma.discoveryEvent.update({
        where: { id: parsedBody.data.eventId },
        data: {
          status: 'processed',
          processedAt: new Date(),
          lastError: null
        }
      })
    ])
  } else {
    await prisma.discoveryEvent.update({
      where: { id: parsedBody.data.eventId },
      data: {
        status: 'failed',
        availableAt: new Date(Date.now() + retryDelayMinutes * 60_000),
        lastError: parsedBody.data.error ?? 'Erro não especificado pelo worker'
      }
    })
  }

  return NextResponse.json({
    success: true,
    status: parsedBody.data.success ? 'processed' : 'failed',
    retryInMinutes: parsedBody.data.success ? null : retryDelayMinutes
  })
}

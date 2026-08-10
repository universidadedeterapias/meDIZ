import { validateWebhookBearer } from '@/lib/webhookAuth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const resultRequestSchema = z.object({
  eventId: z.string().uuid(),
  success: z.boolean(),
  error: z.string().trim().max(2000).optional()
})

/**
 * Chamado pelo worker do ID Vida (Story 4.3, fora deste repo) para reportar o resultado
 * do processamento de um checkpoint de conversa.
 *
 * Este endpoint cuida só da mecânica genérica do outbox (marcar processed/failed, agendar
 * retry) — não assume um schema de dados extraídos (UserFact/lifeCompact), porque este
 * outbox é compartilhado com uma futura story de atualização contínua do ID Pessoa. A
 * escrita dos dados de perfil/fatos é responsabilidade de quem processa o evento, via
 * API própria, antes de chamar este endpoint.
 */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'CONVERSATION_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsedBody = resultRequestSchema.safeParse(await request.json().catch(() => null))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Resultado inválido' }, { status: 400 })
  }

  const event = await prisma.conversationEvent.findUnique({
    where: { id: parsedBody.data.eventId },
    select: { attempts: true }
  })

  if (!event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  if (parsedBody.data.success) {
    await prisma.conversationEvent.update({
      where: { id: parsedBody.data.eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        lastError: null
      }
    })

    return NextResponse.json({ success: true, status: 'processed', retryInMinutes: null })
  }

  const retryDelayMinutes = Math.min(60, 2 ** Math.max(0, event.attempts - 1))

  await prisma.conversationEvent.update({
    where: { id: parsedBody.data.eventId },
    data: {
      status: 'failed',
      availableAt: new Date(Date.now() + retryDelayMinutes * 60_000),
      lastError: parsedBody.data.error ?? 'Erro não especificado pelo worker'
    }
  })

  return NextResponse.json({ success: true, status: 'failed', retryInMinutes: retryDelayMinutes })
}

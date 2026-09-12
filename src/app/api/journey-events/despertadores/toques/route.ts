import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem avisar que mandou um toque das reguas de 48h ("Os Dois
 * Despertadores"), e traz o conversationId que o Chatvolt devolveu no envio.
 *
 * Gravar isto e o que permite achar "quem respondeu" mais tarde sem depender
 * de telefone (ver journey_wakeup_touches no schema). Sem esta chamada, o
 * webhook de resposta nao tem em que conversationId procurar.
 *
 * Upsert, e nao insert: reenviar o mesmo toque (retry do job, corrida entre
 * duas execucoes) atualiza a linha existente em vez de violar o unique de
 * (userId, sistema, toque) — o toque 3 so existe uma vez por pessoa.
 */

const corpo = z.object({
  userId: z.string().min(1),
  sistema: z.enum(['acesso', 'pesquisa']),
  toque: z.number().int().min(1).max(4),
  conversationId: z.string().min(1).max(64),
  template: z.string().max(40).optional()
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: 'erro',
        mensagem: 'Informe userId, sistema, toque e conversationId.'
      },
      { status: 400 }
    )
  }

  const { userId, sistema, toque, conversationId, template } = parsed.data

  try {
    const registro = await prisma.journeyWakeupTouch.upsert({
      where: { userId_sistema_toque: { userId, sistema, toque } },
      create: { userId, sistema, toque, conversationId, template },
      update: {
        conversationId,
        template,
        // Um toque reenviado volta a valer como "enviado, aguardando
        // resposta" — se tinha sido marcado respondido por engano numa
        // conversa antiga, o reenvio abre uma janela nova de fato.
        status: 'enviado',
        enviadoEm: new Date(),
        respondidoEm: null
      },
      select: { id: true }
    })

    return NextResponse.json({ status: 'ok', id: registro.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao gravar o toque.', detalhe: msg },
      { status: 500 }
    )
  }
}

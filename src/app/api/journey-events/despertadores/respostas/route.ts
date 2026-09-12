import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem avisar que uma mensagem chegou numa conversa do Chatvolt, pra
 * fechar as reguas de 48h de quem respondeu.
 *
 * So marca 'respondido' quem ja tinha um toque registrado com este
 * conversationId (ver /despertadores/toques) — resposta a uma mensagem de fora
 * das reguas (o aviso original de acesso, por exemplo, antes do primeiro toque
 * ter sido mandado) ainda nao tem onde pousar aqui. `atualizados: 0` e sinal
 * legitimo disso, nao erro: quem chama nao precisa tratar como falha.
 *
 * Marca TODOS os toques dessa conversa, nao so o mais recente — uma resposta
 * fecha a regua inteira (Sistema 1) ou pausa o avanco dela (Sistema 2), e as
 * duas coisas valem pra qualquer toque que já tenha saido, não só o ultimo.
 */

const corpo = z.object({
  conversationId: z.string().min(1).max(64),
  recebidoEm: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Informe conversationId.' },
      { status: 400 }
    )
  }

  try {
    const respondidoEm = parsed.data.recebidoEm
      ? new Date(parsed.data.recebidoEm)
      : new Date()

    const resultado = await prisma.journeyWakeupTouch.updateMany({
      where: {
        conversationId: parsed.data.conversationId,
        status: 'enviado'
      },
      data: { status: 'respondido', respondidoEm }
    })

    return NextResponse.json({ status: 'ok', atualizados: resultado.count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao gravar a resposta.', detalhe: msg },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n devolve o que aconteceu com cada envio.
 *
 * Quem reivindica precisa responder. Quem nao responde tem a linha devolvida
 * para a fila depois de 15 minutos — e por isso o `enviando` nao e um estado
 * final, e sim uma reserva com prazo.
 *
 * A onda se fecha sozinha quando nao sobra pendente: e o unico jeito de a data
 * de conclusao ser verdade sem alguem lembrar de apertar um botao.
 */

const corpo = z.object({
  itens: z
    .array(
      z.object({
        destinatarioId: z.string().min(1),
        ok: z.boolean(),
        conversationId: z.string().max(120).optional().nullable(),
        erro: z.string().max(500).optional().nullable()
      })
    )
    .min(1)
    .max(200)
})

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

  const agora = new Date()
  let gravados = 0
  const campanhasTocadas = new Set<string>()

  for (const item of parsed.data.itens) {
    const linha = await prisma.reactivationRecipient.findUnique({
      where: { id: item.destinatarioId },
      select: { id: true, campaignId: true, status: true }
    })
    if (!linha) continue

    // Uma resposta que chega depois de a onda ser cancelada nao ressuscita a
    // pessoa: o descarte foi uma decisao, e nao um acidente.
    if (linha.status === 'descartado') continue

    campanhasTocadas.add(linha.campaignId)

    await prisma.reactivationRecipient.update({
      where: { id: linha.id },
      data: item.ok
        ? {
            status: 'enviado',
            enviadoEm: agora,
            claimEm: null,
            conversationId: item.conversationId ?? undefined,
            ultimoErro: null
          }
        : {
            // Volta para `pendente` para o claim tentar de novo. O corte por
            // tentativas mora la, e nao aqui.
            status: 'pendente',
            claimEm: null,
            ultimoErro: (item.erro ?? 'falha sem mensagem').slice(0, 500)
          }
    })
    gravados += 1
  }

  // Fecha a onda que nao tem mais nada a enviar.
  for (const campaignId of campanhasTocadas) {
    const restantes = await prisma.reactivationRecipient.count({
      where: { campaignId, status: { in: ['pendente', 'enviando'] } }
    })
    if (restantes === 0) {
      await prisma.reactivationCampaign.updateMany({
        where: { id: campaignId, status: 'ativa' },
        data: { status: 'concluida', concluidaEm: agora }
      })
    }
  }

  return NextResponse.json({ status: 'ok', gravados })
}

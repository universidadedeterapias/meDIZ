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
  // Nome da tag "Enviado: <onda>" por campanha, resolvido uma vez por lote —
  // nao uma query por item.
  const tagPorCampanha = new Map<string, string>()

  for (const item of parsed.data.itens) {
    const linha = await prisma.reactivationRecipient.findUnique({
      where: { id: item.destinatarioId },
      select: { id: true, campaignId: true, status: true, userId: true }
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

    // A tag "Enviado" marca quem RECEBEU de fato, nao quem entrou na onda —
    // carimbar na criacao marcaria gente que a onda nunca chegou a alcancar.
    // Este e o unico ponto do codigo onde o n8n confirma o envio pessoa a
    // pessoa, entao e aqui que a tag pertence.
    if (item.ok) {
      let tagId = tagPorCampanha.get(linha.campaignId)
      if (!tagId) {
        const campanha = await prisma.reactivationCampaign.findUnique({
          where: { id: linha.campaignId },
          select: { nome: true }
        })
        const nomeTag = `Enviado: ${campanha?.nome ?? linha.campaignId}`.slice(0, 80)
        const tag = await prisma.tag.upsert({
          where: { nome: nomeTag },
          update: {},
          create: { nome: nomeTag, criadoPor: 'sistema · onda de reativação' }
        })
        tagId = tag.id
        tagPorCampanha.set(linha.campaignId, tagId)
      }
      await prisma.userTag.upsert({
        where: { tagId_userId: { tagId, userId: linha.userId } },
        update: {},
        create: { tagId, userId: linha.userId, origem: 'onda', campanhaId: linha.campaignId }
      })
    }
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

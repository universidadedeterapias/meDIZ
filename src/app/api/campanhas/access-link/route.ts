import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { createAccessLink } from '@/lib/auth/access-link'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Tool do Chatvolt: cliente respondeu à campanha de reativação e pediu o
 * acesso na conversa. A IA passa o `conversationId` (que só ela conhece,
 * daquela conversa especifica) e recebe o link pra colar na resposta.
 *
 * Reaproveita exatamente a mesma resolucao que `/r/[token]` ja faz no clique
 * — o link de acesso de verdade nunca existe antes de alguem pedir por ele,
 * seja um clique humano ou esta consulta. Nao precisou de tabela nova: o
 * `conversationId` ja e gravado em `ReactivationRecipient` por
 * `/api/campanhas/result`, junto do `telefone` e do `trackToken`.
 *
 * Diferente da tool de acesso por e-mail/CPF/whatsapp que foi descartada
 * (ver docs/tool-consulta-acesso-chatvolt.md e a decisao do PO registrada na
 * memoria do projeto): ali a entrada era um dado que qualquer um digita, e um
 * link devolvido na resposta da IA virava credencial exposta pra quem
 * alegasse ser o dono de um e-mail. Aqui a entrada e o `conversationId` — so
 * o Chatvolt sabe esse valor pra aquela conversa, e a conversa ja esta
 * atrelada ao numero que NOS disparamos a campanha. Nao ha "alegar ser
 * fulano" no meio: a identidade vem resolvida pelo proprio canal.
 */

const corpo = z.object({
  conversationId: z.string().trim().min(1)
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, mensagem: 'Informe conversationId.' },
      { status: 400 }
    )
  }

  try {
    // Mais recente por enviadoEm: o Chatvolt reaproveita a mesma conversa do
    // numero ao longo do tempo, entao mais de uma onda pode ter usado este
    // mesmo conversationId — o que importa e o disparo mais atual.
    const destinatario = await prisma.reactivationRecipient.findFirst({
      where: { conversationId: parsed.data.conversationId },
      orderBy: { enviadoEm: 'desc' },
      select: { id: true, userId: true, nome: true, clicouEm: true }
    })

    if (!destinatario) {
      return NextResponse.json({ ok: true, found: false })
    }

    // Mesmo criterio de /r/[token]: so o primeiro "toque" conta pra metrica
    // de clique, reenviar a mesma pergunta na conversa nao infla o numero.
    if (!destinatario.clicouEm) {
      await prisma.reactivationRecipient
        .update({ where: { id: destinatario.id }, data: { clicouEm: new Date() } })
        .catch((e) => {
          logger.error(
            'Falha ao registrar clique (tool de conversa)',
            e instanceof Error ? e : undefined,
            '[reativacao]'
          )
        })
    }

    const link = await createAccessLink(destinatario.userId, {
      redirectTo: '/biblioteca'
    })

    return NextResponse.json({
      ok: true,
      found: true,
      nome: destinatario.nome,
      link_acesso: {
        url: link.url,
        expires_at: link.expiresAt.toISOString()
      }
    })
  } catch (e) {
    logger.error(
      'Falha ao gerar link de acesso por conversationId',
      e instanceof Error ? e : undefined,
      '[reativacao]'
    )
    return NextResponse.json(
      {
        ok: false,
        mensagem: 'Não consegui gerar o acesso agora, tente de novo em instantes.'
      },
      { status: 500 }
    )
  }
}

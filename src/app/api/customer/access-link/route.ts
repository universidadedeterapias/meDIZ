import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { lookupCustomer } from '@/lib/customer/lookup'
import { createAccessLink } from '@/lib/auth/access-link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z
  .object({
    email: z.string().trim().optional().nullable(),
    cpf: z.string().trim().optional().nullable(),
    whatsapp: z.string().trim().optional().nullable(),
    redirectTo: z.string().trim().optional().nullable()
  })
  .refine((v) => !!(v.email || v.cpf || v.whatsapp), {
    message: 'Informe email, cpf ou whatsapp'
  })

/**
 * Gera um link de acesso novo e devolve para quem chamou — sem mandar nada.
 *
 * Diferenca deliberada do `/resend-access`: aquela rota sempre dispara WhatsApp/
 * e-mail pelo contato cadastrado, porque foi pensada para "o cliente relatou que
 * nao entra, resolve sozinho". Esta aqui existe para quem quer decidir o que fazer
 * com o link antes de entregar — hoje, o agente da ChatVolt, que recebe o link no
 * corpo da resposta do tool e decide se mostra na propria conversa.
 *
 * Isso muda o modelo de confianca: o link e credencial (entra sem senha), e aqui
 * ele volta na resposta da API em vez de ir so para o canal cadastrado. So faz
 * sentido chamar isto de um contexto que ja confirmou quem esta do outro lado da
 * conversa (ex.: numero de WhatsApp batendo com o cadastro) — nunca a partir de um
 * campo de e-mail livre que qualquer um possa preencher.
 */
export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Informe email, cpf ou whatsapp' },
      { status: 400 }
    )
  }

  try {
    const found = await lookupCustomer(parsed.data)

    if (found.ambiguous) {
      return NextResponse.json(
        {
          status: 'nao_encontrado',
          ok: false,
          reason: 'AMBIGUOUS',
          message:
            'Mais de uma conta usa esse telefone. Peça o e-mail ou o CPF.'
        },
        { status: 409 }
      )
    }

    if (!found.found || !found.customer) {
      return NextResponse.json(
        {
          status: 'nao_encontrado',
          ok: false,
          reason: 'NOT_FOUND',
          message: 'Não encontrei conta com esses dados.',
          vendas_pendentes: found.vendas_pendentes
        },
        { status: 404 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: found.customer.id },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { status: 'nao_encontrado', ok: false, reason: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const redirectTo = parsed.data.redirectTo?.trim() || '/biblioteca'
    const link = await createAccessLink(user.id, { redirectTo })

    logger.info(
      `Link de acesso gerado sob demanda para ${found.customer.email}`,
      '[customer/access-link]'
    )

    return NextResponse.json({
      status: 'ok',
      ok: true,
      link: {
        url: link.url,
        expires_at: link.expiresAt.toISOString()
      },
      customer: {
        nome: found.customer.nome,
        email: found.customer.email
      }
    })
  } catch (error) {
    logger.error(
      'Falha ao gerar link de acesso',
      error instanceof Error ? error : undefined,
      '[customer/access-link]'
    )
    return NextResponse.json(
      {
        status: 'erro',
        error: 'Internal server error',
        mensagem: 'A geracao do link falhou. Nao afirme que a pessoa nao e cliente.'
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { lookupCustomer } from '@/lib/customer/lookup'
import { deliverAccess } from '@/lib/purchases/deliver-access'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z
  .object({
    email: z.string().trim().optional().nullable(),
    cpf: z.string().trim().optional().nullable(),
    whatsapp: z.string().trim().optional().nullable()
  })
  .refine((v) => !!(v.email || v.cpf || v.whatsapp), {
    message: 'Informe email, cpf ou whatsapp'
  })

/**
 * Reenvia o acesso — o "nao consigo entrar" que hoje vira ticket manual.
 *
 * O corpo so IDENTIFICA a pessoa; o aviso sai sempre para o contato cadastrado.
 * Isso e deliberado: sem essa regra, quem tem o bearer poderia mandar um link de
 * acesso de qualquer cliente para um endereco escolhido por ele.
 *
 * O link vale como redefinicao de senha, entao a pessoa volta a entrar mesmo que
 * tenha esquecido a que definiu.
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
      select: { id: true, email: true, name: true, fullName: true, whatsapp: true }
    })

    if (!user) {
      return NextResponse.json(
        { ok: false, reason: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const result = await deliverAccess({
      userId: user.id,
      // Contato cadastrado, nunca o que veio na requisicao.
      email: user.email,
      telefone: user.whatsapp,
      nome: user.fullName ?? user.name,
      // Reenvio sempre leva link: a pessoa esta pedindo justamente porque nao
      // consegue entrar.
      userCreated: false,
      kind: 'access_resent',
      productsGranted: found.produtos.map((p) => ({
        id: p.id,
        title: p.titulo
      })),
      provider: 'resend'
    })

    return NextResponse.json({
      ok: true,
      delivery_id: result.deliveryId,
      enviado: result.sent,
      // Confirma para o agente por onde saiu, sem devolver o contato inteiro.
      canais: {
        email: found.customer.email,
        whatsapp: found.customer.whatsapp
      },
      message: result.sent
        ? 'Acesso reenviado.'
        : 'Reenvio registrado, mas a entrega falhou — verifique as entregas no admin.'
    })
  } catch (error) {
    logger.error(
      'Falha ao reenviar acesso',
      error instanceof Error ? error : undefined,
      '[customer/resend-access]'
    )
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

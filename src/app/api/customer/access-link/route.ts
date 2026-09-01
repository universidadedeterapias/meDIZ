import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { lookupCustomer } from '@/lib/customer/lookup'
import { createAccessLink } from '@/lib/auth/access-link'
import { confereIdentidade, explicaIdentidade } from '@/lib/customer/identity'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z
  .object({
    email: z.string().trim().optional().nullable(),
    cpf: z.string().trim().optional().nullable(),
    whatsapp: z.string().trim().optional().nullable(),
    /**
     * Telefone de quem esta conversando, preenchido pelo canal — nao e o mesmo
     * que `whatsapp`, que e um dos campos de busca e pode ter sido digitado pela
     * pessoa. Sem ele o link nao sai.
     */
    whatsapp_conversa: z.string().trim().optional().nullable(),
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
 * O link e credencial: entra na conta sem senha. Devolve-lo no corpo da resposta
 * so e aceitavel depois de confirmar que quem esta na conversa e o dono da conta,
 * e essa confirmacao mora AQUI. No prompt do agente ela nao vale nada: o campo de
 * e-mail e livre, qualquer pessoa digita o de outra, e um modelo instruido a
 * conferir e um modelo que pode ser convencido do contrario.
 *
 * Quando a identidade nao confere a resposta continua util — nome e contato
 * mascarado, para a Aline dizer para onde o acesso vai — mas sem o link. O
 * caminho seguro nesse caso e o `/resend-access`, que entrega no contato do
 * cadastro: quem nao e dono da conta nao recebe nada, e o dono recebe do mesmo
 * jeito.
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
      select: { id: true, whatsapp: true }
    })

    if (!user) {
      return NextResponse.json(
        { status: 'nao_encontrado', ok: false, reason: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Contato mascarado sai nos dois caminhos: e o que deixa a Aline dizer para
    // onde o acesso vai sem entregar o endereco que a pessoa estava tentando
    // descobrir.
    const contato = {
      nome: found.customer.nome,
      email: found.customer.email,
      whatsapp: found.customer.whatsapp
    }

    const identidade = confereIdentidade(
      user.whatsapp,
      parsed.data.whatsapp_conversa
    )

    if (identidade !== 'confere') {
      logger.warn(
        `Link de acesso negado (${identidade}) para o usuario ${user.id}`,
        '[customer/access-link]'
      )
      // 200, e nao 403: do ponto de vista do atendimento a consulta funcionou, e
      // a pessoa existe. O que nao ha e autorizacao para mostrar o link nesta
      // conversa — e isso e um desfecho normal, com proximo passo claro, nao uma
      // falha que mereca escalar para humano.
      return NextResponse.json({
        status: 'ok',
        ok: false,
        reason: 'IDENTITY_MISMATCH',
        link: null,
        identidade,
        customer: contato,
        orientacao: explicaIdentidade(identidade),
        proximo_passo: 'reenviar_acesso',
        mensagem: `Link nao gerado: ${identidade}.`
      })
    }

    const redirectTo = parsed.data.redirectTo?.trim() || '/biblioteca'
    const link = await createAccessLink(user.id, { redirectTo })

    logger.info(
      `Link de acesso gerado sob demanda para o usuario ${user.id}`,
      '[customer/access-link]'
    )

    return NextResponse.json({
      status: 'ok',
      ok: true,
      identidade,
      link: {
        url: link.url,
        expires_at: link.expiresAt.toISOString()
      },
      customer: contato,
      mensagem: 'Link gerado para o dono da conta.'
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

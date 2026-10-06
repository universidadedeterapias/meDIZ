import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { logger } from '@/lib/logger'
import { enviarPeloPortao, PedidoInvalido, type ResultadoPortao } from '@/lib/mensagens/portao'
import { repositorioPrisma } from '@/lib/mensagens/repositorio-prisma'
import { agentIdPadrao, categoriaDoTemplate, enviarTemplate, enviarTextoZapi } from '@/lib/chatvolt/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Portao de envio (Story 6.1). Os fluxos do n8n chamam aqui no lugar de
 * POST api.chatvolt.ai/whatsapp/{waba}/template-message, mandando o mesmo
 * corpo que ja montam (`corpo_template`) embrulhado com `fluxo` e `chave`.
 *
 * A `chave` diz o que esta sendo mandado, de forma que a mesma mensagem tenha
 * sempre a mesma chave: "trial_fim:<userId>:1", "reativacao:<recipientId>",
 * "entrega_acesso:<deliveryId>". E ela que impede o reenvio — chave repetida
 * volta `ja_enviado` sem chamar o Chatvolt. Ver src/lib/mensagens/portao.ts.
 *
 * Resposta (sempre JSON, com `status`):
 *   200 enviado | ja_enviado | barrado  — o fluxo segue; so `enviado` saiu agora
 *   502 falhou                          — o Chatvolt recusou ou caiu; pode repetir a mesma chave
 *   502 incerto                         — o Chatvolt nao respondeu; NAO repita
 * `messages` repete o que o Chatvolt devolveu, para os nos seguintes do n8n
 * continuarem lendo messages[0].conversationId sem mudanca.
 */

const pedido = z.object({
  fluxo: z.string().regex(/^[a-z0-9_]{2,40}$/, 'fluxo: minusculas, numeros e _'),
  chave: z.string().trim().min(3).max(160),
  userId: z.string().max(64).nullish(),
  // template (padrao): corpo do template do Chatvolt, com templateName.
  // zapi: { to, message } + zapiInstancia — texto livre por numero da Z-API.
  canal: z.enum(['template', 'zapi']).optional().default('template'),
  zapiInstancia: z.string().max(64).nullish(),
  corpo: z
    .object({
      to: z.string().min(1),
      templateName: z.string().min(1).max(80).optional(),
      message: z.string().min(1).max(4000).optional()
    })
    .passthrough(),
  n8nWorkflowId: z.string().max(40).nullish(),
  n8nExecucaoId: z.coerce.string().max(40).nullish()
}).superRefine((p, ctx) => {
  if (p.canal === 'template' && !p.corpo.templateName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['corpo', 'templateName'], message: 'obrigatorio no canal template' })
  }
  if (p.canal === 'zapi' && (!p.corpo.message || !p.zapiInstancia)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['corpo', 'message'], message: 'canal zapi precisa de corpo.message e zapiInstancia' })
  }
})

const HTTP_DO_RESULTADO: Record<ResultadoPortao, number> = {
  enviado: 200,
  ja_enviado: 200,
  barrado: 200,
  falhou: 502,
  incerto: 502
}

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = pedido.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: 'erro',
        mensagem: 'Informe fluxo, chave e corpo (com to e templateName).',
        detalhe: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      },
      { status: 400 }
    )
  }

  try {
    const r = await enviarPeloPortao(parsed.data as Parameters<typeof enviarPeloPortao>[0], {
      repo: repositorioPrisma,
      canal: {
        enviar: (corpo, opcoes) =>
          opcoes?.canal === 'zapi'
            ? enviarTextoZapi(opcoes.zapiInstancia ?? '', corpo.to, corpo.message ?? '')
            : enviarTemplate(corpo)
      },
      categoriaDoTemplate,
      agentIdPadrao: agentIdPadrao()
    })

    if (r.status === 'falhou' || r.status === 'incerto') {
      logger.warn(`portao: ${r.status} — ${r.motivo}`, '[mensagens/enviar]', {
        fluxo: parsed.data.fluxo,
        chave: parsed.data.chave,
        envioId: r.envioId
      })
    }

    const chatvolt = (r.chatvolt && typeof r.chatvolt === 'object' ? r.chatvolt : {}) as { messages?: unknown }
    return NextResponse.json(
      {
        status: r.status,
        motivo: r.motivo,
        envioId: r.envioId,
        conversationId: r.conversationId,
        httpStatusChatvolt: r.httpStatus,
        messages: Array.isArray(chatvolt.messages) ? chatvolt.messages : []
      },
      { status: HTTP_DO_RESULTADO[r.status] }
    )
  } catch (e) {
    if (e instanceof PedidoInvalido) {
      return NextResponse.json({ status: 'erro', mensagem: e.message }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    logger.error('portao: erro interno', e instanceof Error ? e : undefined, '[mensagens/enviar]', {
      fluxo: parsed.data.fluxo,
      chave: parsed.data.chave
    })
    // Erro antes ou durante a reserva: nada foi enviado. Erro depois do envio
    // (gravando o resultado) deixa a linha `reservado`, que ja bloqueia
    // reenvio da mesma chave.
    return NextResponse.json({ status: 'erro', mensagem: 'Falha interna no portao.', detalhe: msg }, { status: 500 })
  }
}

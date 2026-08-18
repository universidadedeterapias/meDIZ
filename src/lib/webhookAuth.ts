import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Bearer que so passa a valer quando o segredo esta configurado.
 *
 * Existe para fechar um webhook que hoje esta aberto em producao sem derrubar as
 * vendas no instante do deploy: enquanto a env nao for definida, a requisicao
 * passa e o log grita. Definida a env, vira obrigatorio.
 *
 * E um estado de transicao, nao um modo de operacao — o objetivo e definir a env
 * e depois trocar esta chamada por `validateWebhookBearer`.
 */
export function validateWebhookBearerWhenConfigured(
  request: NextRequest,
  envVarName: string
): NextResponse | null {
  const secret = process.env[envVarName]?.trim()

  if (!secret) {
    logger.warn(
      `${envVarName} não configurado — webhook aceitando requisição não autenticada`,
      '[webhookAuth]'
    )
    return null
  }

  return validateWebhookBearer(request, envVarName)
}

export function validateWebhookBearer(
  request: NextRequest,
  envVarName: string = 'WEBHOOK_SECRET_TOKEN'
): NextResponse | null {
  const secret = process.env[envVarName]
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

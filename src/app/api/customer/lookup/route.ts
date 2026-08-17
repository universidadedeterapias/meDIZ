import { NextRequest, NextResponse } from 'next/server'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { lookupCustomer } from '@/lib/customer/lookup'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Consulta de cliente para o atendimento (agentes da ChatVolt, via n8n).
 *
 * Aceita `email`, `cpf` ou `whatsapp`. Na pratica o atendimento pede e-mail ou
 * CPF; o telefone existe para quando o agente ja tem o numero de quem esta na
 * conversa e quer tentar antes de perguntar.
 */
export async function GET(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const email = params.get('email')
  const cpf = params.get('cpf')
  const whatsapp = params.get('whatsapp')

  if (!email && !cpf && !whatsapp) {
    return NextResponse.json(
      { error: 'Informe email, cpf ou whatsapp' },
      { status: 400 }
    )
  }

  try {
    const result = await lookupCustomer({ email, cpf, whatsapp })
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[customer/lookup]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

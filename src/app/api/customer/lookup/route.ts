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
/**
 * Envelope comum das tools do atendimento.
 *
 * A Aline precisa distinguir "essa pessoa nao comprou" de "a consulta falhou" —
 * sem isso as duas viram a mesma frase, e foi assim que cliente real ouviu que
 * nao era cliente. Vazio por falha e vazio por inexistencia sao coisas opostas
 * para quem esta do outro lado.
 *
 * Entra SOMADO aos campos antigos, e nao no lugar deles: a ferramenta ja
 * cadastrada nos dois agentes le `ok` e `reason`, e trocar o formato de uma vez
 * calaria a Aline no meio das conversas em andamento.
 */
function statusDaConsulta(found: {
  found: boolean
  ambiguous: boolean
}): `ok` | `nao_encontrado` {
  // Telefone que bate em mais de uma conta nao e falha tecnica: e dado
  // insuficiente, e o caminho e pedir e-mail ou CPF. O `ambiguous` continua no
  // corpo para a Aline saber qual das duas perguntas fazer.
  return found.found && !found.ambiguous ? `ok` : `nao_encontrado`
}

export async function GET(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const email = params.get('email')
  const cpf = params.get('cpf')
  const whatsapp = params.get('whatsapp')

  if (!email && !cpf && !whatsapp) {
    // Chamada sem identificacao e defeito de quem chamou, e nao ausencia de
    // compra: por isso ' + erro + ', e nao ' + nao_encontrado + '.
    return NextResponse.json(
      {
        status: 'erro',
        error: 'Informe email, cpf ou whatsapp',
        mensagem: 'Consulta chamada sem email, cpf nem whatsapp.'
      },
      { status: 400 }
    )
  }

  try {
    const result = await lookupCustomer({ email, cpf, whatsapp })
    return NextResponse.json(
      { status: statusDaConsulta(result), ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[customer/lookup]', error)
    return NextResponse.json(
      {
        status: 'erro',
        error: 'Internal server error',
        mensagem: 'A consulta falhou. Nao afirme que a pessoa nao e cliente.'
      },
      { status: 500 }
    )
  }
}

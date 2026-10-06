import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { listarMensagens } from '@/lib/automacoes/painel'

export const dynamic = 'force-dynamic'

const STATUS = new Set(['reservado', 'enviado', 'barrado', 'falhou', 'incerto'])

/**
 * Ultimos envios do portao. A busca aceita telefone (so digitos, 4 ou mais),
 * chave ou template — no atendimento a pergunta chega como "fulano recebeu?".
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const p = request.nextUrl.searchParams
  const status = p.get('status')
  const offset = Number(p.get('offset'))
  return NextResponse.json(
    await listarMensagens({
      fluxo: p.get('fluxo') || null,
      status: status && STATUS.has(status) ? status : null,
      busca: p.get('busca'),
      offset: Number.isFinite(offset) ? offset : 0,
      limite: 25
    })
  )
}

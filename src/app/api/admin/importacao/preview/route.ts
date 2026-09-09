import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { montarPreview, type MapeamentoColunas } from '@/lib/importacao/preview'
import type { LinhaBruta } from '@/lib/importacao/planilha'

export const dynamic = 'force-dynamic'

const MAXIMO_LINHAS = 20_000

/**
 * Segundo passo do wizard: roda o matching linha a linha (lookupCustomer) e
 * devolve a classificação de cada uma. Ainda não grava nada.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const corpo = await request.json().catch(() => null)
  const linhas = Array.isArray(corpo?.linhas) ? (corpo.linhas as LinhaBruta[]) : []
  const mapeamento = (corpo?.mapeamento ?? {}) as MapeamentoColunas

  if (linhas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma linha para revisar.' }, { status: 400 })
  }
  if (linhas.length > MAXIMO_LINHAS) {
    return NextResponse.json(
      { error: `Máximo de ${MAXIMO_LINHAS.toLocaleString('pt-BR')} linhas por importação.` },
      { status: 400 }
    )
  }
  if (!mapeamento.email) {
    return NextResponse.json(
      { error: 'Escolha qual coluna é o e-mail.' },
      { status: 400 }
    )
  }

  try {
    const preview = await montarPreview(linhas, mapeamento)
    const contagens = {
      novo: preview.filter((l) => l.classificacao === 'novo').length,
      existente: preview.filter((l) => l.classificacao === 'existente').length,
      ambiguo: preview.filter((l) => l.classificacao === 'ambiguo').length,
      erro: preview.filter((l) => l.classificacao === 'erro').length
    }
    return NextResponse.json({ preview, contagens })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { error: 'Falha ao revisar as linhas.', detalhe: msg },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { lerPlanilha } from '@/lib/importacao/planilha'

export const dynamic = 'force-dynamic'

const EXTENSOES_ACEITAS = ['.xlsx', '.xls', '.csv']
const TAMANHO_MAXIMO = 10 * 1024 * 1024 // 10MB

/**
 * Primeiro passo do wizard de importação: recebe o arquivo, devolve colunas
 * detectadas + linhas cruas. Não grava nada — o mapeamento e a confirmação
 * são passos separados.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const formData = await request.formData().catch(() => null)
  const arquivo = formData?.get('arquivo')

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }

  const nome = arquivo.name.toLowerCase()
  if (!EXTENSOES_ACEITAS.some((ext) => nome.endsWith(ext))) {
    return NextResponse.json(
      { error: 'Formato não aceito. Envie .xlsx, .xls ou .csv.' },
      { status: 400 }
    )
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ error: 'Arquivo maior que 10MB.' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer())
    const { colunas, linhas } = lerPlanilha(buffer)

    if (linhas.length === 0) {
      return NextResponse.json(
        { error: 'A planilha não tem linhas de dados.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ nomeArquivo: arquivo.name, colunas, linhas })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { error: 'Não consegui ler essa planilha.', detalhe: msg },
      { status: 400 }
    )
  }
}

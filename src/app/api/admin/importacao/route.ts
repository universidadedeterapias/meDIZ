import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { aplicarImportacao } from '@/lib/importacao/aplicar'
import type { LinhaPreview } from '@/lib/importacao/preview'

export const dynamic = 'force-dynamic'

/** Histórico dos lotes já importados — auditoria, não uma tela de trabalho. */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const lotes = await prisma.importacaoPlanilha.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 50
  })

  return NextResponse.json({
    lotes: lotes.map((l) => ({
      id: l.id,
      nomeArquivo: l.nomeArquivo,
      catalogProductId: l.catalogProductId,
      concedeAcesso: l.concedeAcesso,
      tagId: l.tagId,
      totalLinhas: l.totalLinhas,
      totalCriados: l.totalCriados,
      totalCasados: l.totalCasados,
      totalAmbiguos: l.totalAmbiguos,
      totalIgnorados: l.totalIgnorados,
      criadoPor: l.criadoPor,
      criadoEm: l.criadoEm.toISOString(),
      concluidoEm: l.concluidoEm?.toISOString() ?? null
    }))
  })
}

/** Último passo do wizard: aplica de verdade o que a revisão deixou passar. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const corpo = await request.json().catch(() => null)
  const nomeArquivo = typeof corpo?.nomeArquivo === 'string' ? corpo.nomeArquivo : 'planilha'
  const catalogProductId = typeof corpo?.catalogProductId === 'string' ? corpo.catalogProductId : ''
  const concedeAcesso = corpo?.concedeAcesso === true
  const linhas = Array.isArray(corpo?.linhas) ? (corpo.linhas as LinhaPreview[]) : []

  if (!catalogProductId) {
    return NextResponse.json({ error: 'Escolha o produto do catálogo.' }, { status: 400 })
  }
  if (linhas.length === 0) {
    return NextResponse.json({ error: 'Nenhuma linha para importar.' }, { status: 400 })
  }

  try {
    const resultado = await aplicarImportacao({
      nomeArquivo,
      catalogProductId,
      concedeAcesso,
      linhas,
      criadoPor: auth.user.email
    })
    return NextResponse.json(resultado, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao aplicar a importação.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

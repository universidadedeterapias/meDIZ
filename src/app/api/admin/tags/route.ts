import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/**
 * Tags livres: criar e listar.
 *
 * Não presa à reativação — a mesma tabela serve importação de planilha,
 * marcação manual no painel e "Enviado: <onda>" quando um disparo é
 * confirmado. Aplicar/remover em pessoas mora em `[id]/aplicar` e
 * `[id]/remover`, porque isso pode acontecer em massa sobre uma seleção
 * inteira, e o corpo de uma dessas chamadas é bem diferente de criar a tag.
 */

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const tags = await prisma.tag.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { usuarios: true } } }
  })

  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      nome: t.nome,
      cor: t.cor,
      totalPessoas: t._count.usuarios,
      criadoEm: t.criadoEm.toISOString()
    }))
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const corpo = await request.json().catch(() => null)
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim().slice(0, 80) : ''
  const cor = typeof corpo?.cor === 'string' ? corpo.cor.trim().slice(0, 16) : null

  if (!nome) {
    return NextResponse.json({ error: 'Dê um nome à tag.' }, { status: 400 })
  }

  try {
    const tag = await prisma.tag.create({
      data: { nome, cor, criadoPor: auth.user.email }
    })
    return NextResponse.json(
      { id: tag.id, nome: tag.nome, cor: tag.cor, totalPessoas: 0 },
      { status: 201 }
    )
  } catch (e) {
    // P2002 = unique constraint — nome de tag já existe.
    const codigo = (e as { code?: string } | null)?.code
    if (codigo === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma tag com esse nome.' }, { status: 409 })
    }
    throw e
  }
}

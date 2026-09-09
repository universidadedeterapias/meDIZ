import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/**
 * Aplica uma tag a uma ou várias pessoas de uma vez.
 *
 * O corpo já nasce como `userIds: string[]` — tanto faz se é uma pessoa aberta
 * no painel lateral ou uma seleção inteira feita por checkbox na tela: é o
 * mesmo contrato, para a tela de seleção não precisar de um endpoint próprio.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await params
  const corpo = (await request.json().catch(() => null)) as { userIds?: unknown } | null
  const bruto: unknown[] = Array.isArray(corpo?.userIds) ? corpo.userIds : []
  const userIds = [...new Set(bruto.filter((v): v is string => typeof v === 'string'))].slice(0, 50_000)

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'Nenhuma pessoa informada.' }, { status: 400 })
  }

  const tag = await prisma.tag.findUnique({ where: { id }, select: { id: true } })
  if (!tag) {
    return NextResponse.json({ error: 'Tag não encontrada.' }, { status: 404 })
  }

  const resultado = await prisma.userTag.createMany({
    data: userIds.map((userId) => ({
      tagId: id,
      userId,
      origem: 'manual',
      criadoPor: auth.user.email
    })),
    skipDuplicates: true
  })

  return NextResponse.json({ ok: true, aplicadas: resultado.count })
}

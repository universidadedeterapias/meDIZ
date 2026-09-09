import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/** Tira a tag de uma ou várias pessoas. Não apaga a tag em si — ela continua
 *  existindo para quem mais a usa. */
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

  const resultado = await prisma.userTag.deleteMany({
    where: { tagId: id, userId: { in: userIds } }
  })

  return NextResponse.json({ ok: true, removidas: resultado.count })
}

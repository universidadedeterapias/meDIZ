import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/** Apaga a tag. `onDelete: Cascade` em UserTag limpa quem estava marcado —
 *  a confirmação ("tem certeza, N pessoas perdem essa tag") é do client. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await params

  try {
    await prisma.tag.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const codigo = (e as { code?: string } | null)?.code
    if (codigo === 'P2025') {
      return NextResponse.json({ error: 'Tag não encontrada.' }, { status: 404 })
    }
    throw e
  }
}

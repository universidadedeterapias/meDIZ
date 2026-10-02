import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { statusDaCotaDePesquisa } from '@/lib/search-quota'
import { logUserAction, AuditActions } from '@/lib/auditLogger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Cota diaria de pesquisas do plano gratuito, vista e zerada pelo suporte.
 *
 * Zerar grava `searchQuotaResetAt = agora`: as pesquisas de hoje continuam no
 * historico da pessoa, so deixam de contar. A cota volta ao normal sozinha na
 * virada do dia.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params
  const status = await statusDaCotaDePesquisa(id)
  if (!status) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { id } = await context.params
  const antes = await statusDaCotaDePesquisa(id)
  if (!antes) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id },
    data: { searchQuotaResetAt: new Date() }
  })

  const admin = await prisma.user.findUnique({
    where: { email: auth.user.email },
    select: { id: true }
  })
  if (admin) {
    await logUserAction(
      admin.id,
      auth.user.email,
      AuditActions.USER_UPDATE,
      id,
      {
        action: 'reset_search_quota',
        usadasAntes: antes.usadasHoje,
        searchLimit: antes.searchLimit
      },
      req
    )
  }

  const status = await statusDaCotaDePesquisa(id)
  return NextResponse.json({ ok: true, ...status })
}

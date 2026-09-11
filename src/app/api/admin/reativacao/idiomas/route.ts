import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'

export const dynamic = 'force-dynamic'

/**
 * Valores de idioma que existem de verdade na base, com quantas pessoas cada
 * um tem.
 *
 * Existe pra o filtro de idioma da reativação não depender de uma lista fixa
 * no código: `preferredLanguage` é texto livre (não enum no schema), e uma
 * lista hardcoded fica cega a um idioma novo que apareça amanhã — ou, pior,
 * continua oferecendo um valor que não existe mais em ninguém.
 */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const grupos = await prisma.user.groupBy({
    by: ['preferredLanguage'],
    where: { preferredLanguage: { not: null } },
    _count: { _all: true }
  })

  const idiomas = grupos
    .filter((g): g is typeof g & { preferredLanguage: string } => Boolean(g.preferredLanguage))
    .map((g) => ({ valor: g.preferredLanguage, totalPessoas: g._count._all }))
    .sort((a, b) => b.totalPessoas - a.totalPessoas)

  return NextResponse.json({ idiomas })
}

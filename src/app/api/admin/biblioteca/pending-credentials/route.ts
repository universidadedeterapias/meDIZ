import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { getLibraryPermissionsByEmail } from '@/lib/library/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const users = await prisma.user.findMany({
    where: {
      temporaryPasswordPlain: { not: null },
      whatsappSentAt: null
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      temporaryPasswordPlain: true,
      createdAt: true
    }
  })

  const items = await Promise.all(
    users.map(async (user) => {
      const permissoes = await getLibraryPermissionsByEmail(user.email)
      return {
        user_id: user.id,
        nome: user.name ?? user.email.split('@')[0],
        email: user.email,
        temporary_password: user.temporaryPasswordPlain,
        created_at: user.createdAt.toISOString(),
        permissoes
      }
    })
  )

  return NextResponse.json({ items })
}

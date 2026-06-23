import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import {
  getLibraryPermissionsForUser,
  hasAudioterapiaAccess
} from '@/lib/library/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const auth = await requireUser({ pathname: '/api/me/audioterapia' })
  if (auth.ok === false) return auth.response

  const permissoes = await getLibraryPermissionsForUser(auth.user)

  return NextResponse.json(
    {
      tem_acesso_a_audioterapia: hasAudioterapiaAccess(permissoes),
      audioterapia: permissoes.audioterapia
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache'
      }
    }
  )
}

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/requireAuth'
import {
  getLibraryPermissionsForUser,
  hasBibliotecaAccess
} from '@/lib/library/permissions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const auth = await requireUser({ pathname: '/api/me/library' })
  if (auth.ok === false) return auth.response

  const permissoes = await getLibraryPermissionsForUser(auth.user)

  return NextResponse.json(
    {
      tem_acesso_a_biblioteca: hasBibliotecaAccess(permissoes),
      permissoes
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache'
      }
    }
  )
}

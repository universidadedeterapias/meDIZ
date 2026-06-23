import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Legado: capas devem ser enviadas via URL pré-assinada no navegador. */
export async function POST() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  return NextResponse.json(
    {
      error:
        'Use o upload direto no R2 (URL pré-assinada). O arquivo não deve passar por esta rota.'
    },
    { status: 410 }
  )
}

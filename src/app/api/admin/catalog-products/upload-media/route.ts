import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Legado: uploads grandes devem usar URL pré-assinada (PUT direto no R2). */
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

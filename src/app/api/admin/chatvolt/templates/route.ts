import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { listTemplates } from '@/lib/chatvolt/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const templates = await listTemplates()
    return NextResponse.json({ templates })
  } catch (e) {
    logger.error(
      'Falha ao listar templates do Chatvolt',
      e instanceof Error ? e : undefined,
      '[admin/chatvolt]'
    )
    return NextResponse.json(
      { error: 'Não foi possível consultar os templates no Chatvolt agora.' },
      { status: 502 }
    )
  }
}

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { listScenarios } from '@/lib/chatvolt/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const scenarios = await listScenarios()
    return NextResponse.json({ scenarios })
  } catch (e) {
    logger.error(
      'Falha ao listar cenários do Chatvolt',
      e instanceof Error ? e : undefined,
      '[admin/chatvolt]'
    )
    return NextResponse.json(
      { error: 'Não foi possível consultar os cenários no Chatvolt agora.' },
      { status: 502 }
    )
  }
}

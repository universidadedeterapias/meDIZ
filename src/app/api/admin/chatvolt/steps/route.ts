import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { listSteps } from '@/lib/chatvolt/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const scenarioId = request.nextUrl.searchParams.get('scenarioId')?.trim()
  if (!scenarioId) {
    return NextResponse.json({ error: 'Informe scenarioId.' }, { status: 400 })
  }

  try {
    const steps = await listSteps(scenarioId)
    return NextResponse.json({ steps })
  } catch (e) {
    logger.error(
      'Falha ao listar etapas do Chatvolt',
      e instanceof Error ? e : undefined,
      '[admin/chatvolt]'
    )
    return NextResponse.json(
      { error: 'Não foi possível consultar as etapas no Chatvolt agora.' },
      { status: 502 }
    )
  }
}

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import { montarPainel } from '@/lib/automacoes/painel'
import { n8nDaApi, urlDoN8n } from '@/lib/vigia/fontes'

export const dynamic = 'force-dynamic'

/** Painel das automacoes (Story 6.4): envios, fluxos, estado no n8n e alertas. */
export async function GET() {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    return NextResponse.json(await montarPainel(n8nDaApi(), urlDoN8n()))
  } catch (e) {
    return NextResponse.json(
      { error: 'Falha ao montar o painel', detalhe: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

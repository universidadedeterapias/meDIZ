import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { registrarResultado } from '@/lib/mapa/geracao'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Callback do gerador no n8n (workflow "Mapa — Gerador", Story 7.2).
 *
 * Corpo: `{ mapa_id, conteudo }` quando gerou, ou `{ mapa_id, erro }` quando
 * desistiu. O conteudo e validado contra o schema; invalido vira erro com o
 * motivo, e a resposta 422 diz ao n8n qual campo veio errado.
 */
const corpoSchema = z.object({
  mapa_id: z.string().min(1).max(64),
  conteudo: z.unknown().optional(),
  erro: z.string().max(400).nullable().optional()
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request, 'MAPA_WEBHOOK_TOKEN')
  if (authError) return authError

  const parsed = corpoSchema.safeParse(await request.json().catch(() => null))
  if (
    !parsed.success ||
    (parsed.data.conteudo === undefined && !parsed.data.erro)
  ) {
    return NextResponse.json(
      { error: 'Envie mapa_id e conteudo (ou erro).' },
      { status: 400 }
    )
  }

  const resultado = await registrarResultado({
    mapaId: parsed.data.mapa_id,
    conteudo: parsed.data.conteudo,
    erro: parsed.data.erro ?? null
  })

  if (resultado.ok === false) {
    return NextResponse.json({ error: resultado.erro }, { status: resultado.status })
  }
  return NextResponse.json({ ok: true })
}

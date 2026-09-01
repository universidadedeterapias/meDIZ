import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { validateWebhookBearer } from '@/lib/webhookAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n conta o que aconteceu com o evento que reivindicou.
 *
 * Sem esta chamada o evento fica preso em `processing` por 10 minutos antes de
 * voltar para a fila — funciona, mas atrasa. Responder e o que mantem a fila
 * andando no ritmo real.
 *
 * Falha nao e o fim: a linha volta para a fila com espera crescente, ate a quinta
 * tentativa. E deliberado que o erro fique gravado em `last_error` — "essa pessoa
 * nao tem conversa no Chatvolt" e uma resposta legitima, e e no admin que ela
 * precisa aparecer, nao num log que ninguem le.
 */

const corpo = z.object({
  evento_id: z.string().uuid(),
  sucesso: z.boolean(),
  erro: z.string().trim().max(2000).optional()
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Informe evento_id e sucesso.' },
      { status: 400 }
    )
  }

  const evento = await prisma.journeyEvent.findUnique({
    where: { id: parsed.data.evento_id },
    select: { attempts: true }
  })

  if (!evento) {
    return NextResponse.json(
      { status: 'nao_encontrado', mensagem: 'Evento nao encontrado.' },
      { status: 404 }
    )
  }

  if (parsed.data.sucesso) {
    await prisma.journeyEvent.update({
      where: { id: parsed.data.evento_id },
      data: { status: 'processed', processedAt: new Date(), lastError: null }
    })

    return NextResponse.json({ status: 'ok', situacao: 'processed' })
  }

  // Espera dobrando a cada tentativa, com teto de uma hora: instabilidade curta
  // se resolve na primeira repeticao, e o que nao se resolve nao melhora sendo
  // tentado de minuto em minuto.
  const esperaMinutos = Math.min(60, 2 ** Math.max(0, evento.attempts - 1))

  await prisma.journeyEvent.update({
    where: { id: parsed.data.evento_id },
    data: {
      status: 'failed',
      availableAt: new Date(Date.now() + esperaMinutos * 60_000),
      lastError: parsed.data.erro ?? 'Erro nao informado pelo n8n'
    }
  })

  return NextResponse.json({
    status: 'ok',
    situacao: 'failed',
    tentar_em_minutos: esperaMinutos
  })
}

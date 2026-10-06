import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/requireAuth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Liga/desliga um fluxo e ajusta os tetos do portao de envio (Story 6.4).
 *
 * Desligar aqui nao para o workflow no n8n: ele continua rodando e tudo o que
 * tentar enviar volta `barrado`. E o freio de emergencia — vale na hora, sem
 * abrir o n8n, e nao perde ninguem: Trial, Despertadores e Recuperacao tentam
 * de novo na rodada seguinte, e a Reativacao adia sem gastar tentativa.
 */

const corpo = z
  .object({
    ligado: z.boolean().optional(),
    tetoDiario: z.number().int().min(0).max(100_000).optional(),
    limitePessoa24h: z.number().int().min(1).max(20).optional()
  })
  .refine((c) => Object.keys(c).length > 0, 'nada para alterar')

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ fluxo: string }> }) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  const { fluxo } = await params
  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join('; ') }, { status: 400 })
  }

  const existente = await prisma.fluxoAutomacao.findUnique({ where: { fluxo } })
  if (!existente) return NextResponse.json({ error: 'Fluxo não encontrado' }, { status: 404 })

  const atualizado = await prisma.fluxoAutomacao.update({
    where: { fluxo },
    data: { ...parsed.data, atualizadoPor: auth.user.email.slice(0, 120) }
  })

  logger.info(`fluxo ${fluxo} alterado por ${auth.user.email}`, '[admin/automacoes]', {
    antes: { ligado: existente.ligado, tetoDiario: existente.tetoDiario, limitePessoa24h: existente.limitePessoa24h },
    depois: parsed.data
  })

  return NextResponse.json({
    fluxo: atualizado.fluxo,
    ligado: atualizado.ligado,
    tetoDiario: atualizado.tetoDiario,
    limitePessoa24h: atualizado.limitePessoa24h,
    atualizadoPor: atualizado.atualizadoPor,
    atualizadoEm: atualizado.atualizadoEm.toISOString()
  })
}

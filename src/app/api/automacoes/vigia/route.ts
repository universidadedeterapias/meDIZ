import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { executarVigia, resumoDiario } from '@/lib/vigia/vigia'
import { enviarTelegram, mensagensPrisma, n8nDaApi, registroPrisma, urlDoN8n } from '@/lib/vigia/fontes'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * Vigia das automacoes (Story 6.3), chamado pelo cron da Vercel:
 *   a cada 15 min       -> GET /api/automacoes/vigia
 *   todo dia as 08h BRT -> GET /api/automacoes/vigia?resumo=1
 *
 * Autenticado pelo CRON_SECRET: a Vercel manda `Authorization: Bearer
 * <CRON_SECRET>` sozinha quando a env existe. `?secret=` serve para disparar a
 * mao. O `x-vercel-cron` que /api/push/check-reminders aceita nao vale aqui:
 * qualquer um manda esse header.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim()
  // O CRON_SECRET da Vercel e base64 e tem `+`, que na URL chega como espaco
  // quando nao vem codificado (%2B). Mesma correcao de /api/push/check-reminders.
  const doQuery = request.nextUrl.searchParams.get('secret')?.replace(/ /g, '+')
  const autorizado =
    !!segredo &&
    (request.headers.get('authorization') === `Bearer ${segredo}` || doQuery === segredo)
  if (!autorizado) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const deps = {
    mensagens: mensagensPrisma,
    n8n: n8nDaApi(),
    registro: registroPrisma,
    enviarTelegram,
    urlN8n: urlDoN8n()
  }

  try {
    if (request.nextUrl.searchParams.get('resumo') === '1') {
      const texto = await resumoDiario(deps)
      return NextResponse.json({ status: 'ok', resumo: texto })
    }
    const r = await executarVigia(deps)
    if (r.erros.length) logger.warn(`vigia: ${r.erros.join(' | ')}`, '[automacoes/vigia]')
    return NextResponse.json({ status: 'ok', ...r })
  } catch (e) {
    logger.error('vigia falhou', e instanceof Error ? e : undefined, '[automacoes/vigia]')
    return NextResponse.json(
      { status: 'erro', mensagem: e instanceof Error ? e.message : 'erro desconhecido' },
      { status: 500 }
    )
  }
}

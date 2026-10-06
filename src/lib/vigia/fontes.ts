import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { Alerta, ExecucaoN8n, FonteMensagens, FonteN8n, RegistroAlertas } from './vigia'

/**
 * As fontes reais do vigia: o registro do portao no Postgres, a API publica
 * do n8n e o Telegram. A logica das regras fica em vigia.ts.
 */

const num = (v: unknown) => Number(v ?? 0)

export const mensagensPrisma: FonteMensagens = {
  async repetidas(desde) {
    const linhas = await prisma.$queryRaw<{ telefone: string; template: string; n: bigint }[]>(Prisma.sql`
      SELECT telefone, template, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'enviado' AND enviado_em >= ${desde}
       GROUP BY telefone, template
      HAVING count(*) > 1
       ORDER BY n DESC
       LIMIT 20
    `)
    return linhas.map((l) => ({ telefone: l.telefone, template: l.template, n: num(l.n) }))
  },

  async enviadosPorFluxo(desde) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; n: bigint }[]>(Prisma.sql`
      SELECT fluxo, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'enviado' AND enviado_em >= ${desde}
       GROUP BY fluxo
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, n: num(l.n) }))
  },

  async maiorHoraPorFluxo(desde, ate) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; max: bigint }[]>(Prisma.sql`
      SELECT fluxo, max(n) AS max FROM (
        SELECT fluxo, date_trunc('hour', enviado_em) AS hora, count(*) AS n
          FROM mensagens_enviadas
         WHERE status = 'enviado' AND enviado_em >= ${desde} AND enviado_em < ${ate}
         GROUP BY fluxo, hora
      ) por_hora
      GROUP BY fluxo
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, max: num(l.max) }))
  },

  async doDiaComTeto(inicioDoDia) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; n: bigint; teto: number }[]>(Prisma.sql`
      SELECT f.fluxo, count(m.id) AS n, f.teto_diario AS teto
        FROM fluxos_automacao f
        LEFT JOIN mensagens_enviadas m
          ON m.fluxo = f.fluxo
         AND m.status IN ('reservado', 'enviado', 'incerto')
         AND m.tentativa_em >= ${inicioDoDia}
       GROUP BY f.fluxo, f.teto_diario
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, n: num(l.n), teto: Number(l.teto) }))
  },

  async barradosPorTeto(desde) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; n: bigint }[]>(Prisma.sql`
      SELECT fluxo, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'barrado' AND motivo LIKE 'teto diario%' AND tentativa_em >= ${desde}
       GROUP BY fluxo
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, n: num(l.n) }))
  },

  async falhas(desde) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; status: string; n: bigint; motivo: string | null }[]>(Prisma.sql`
      SELECT fluxo, status, count(*) AS n,
             (array_agg(motivo ORDER BY tentativa_em DESC))[1] AS motivo
        FROM mensagens_enviadas
       WHERE status IN ('falhou', 'incerto') AND tentativa_em >= ${desde}
       GROUP BY fluxo, status
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, status: l.status, n: num(l.n), motivo: l.motivo }))
  },

  async reservasPresas(antesDe) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; n: bigint }[]>(Prisma.sql`
      SELECT fluxo, count(*) AS n
        FROM mensagens_enviadas
       WHERE status = 'reservado' AND tentativa_em < ${antesDe}
       GROUP BY fluxo
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, n: num(l.n) }))
  },

  async resumo(desde, ate) {
    const linhas = await prisma.$queryRaw<{ fluxo: string; status: string; categoria: string | null; n: bigint }[]>(Prisma.sql`
      SELECT fluxo, status, categoria, count(*) AS n
        FROM mensagens_enviadas
       WHERE tentativa_em >= ${desde} AND tentativa_em < ${ate}
       GROUP BY fluxo, status, categoria
    `)
    return linhas.map((l) => ({ fluxo: l.fluxo, status: l.status, categoria: l.categoria, n: num(l.n) }))
  }
}

export const URL_N8N_PADRAO = 'https://mediz-n8n.gjhi7d.easypanel.host'

/** null quando N8N_API_KEY nao esta configurada — o vigia avisa isso no retorno. */
export function n8nDaApi(): FonteN8n | null {
  const chave = process.env.N8N_API_KEY?.trim()
  if (!chave) return null
  const base = (process.env.N8N_API_URL?.trim() || URL_N8N_PADRAO).replace(/\/$/, '')

  async function get<T>(caminho: string): Promise<T> {
    const res = await fetch(`${base}/api/v1${caminho}`, {
      headers: { 'X-N8N-API-KEY': chave! },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) throw new Error(`API do n8n respondeu HTTP ${res.status} em ${caminho.split('?')[0]}`)
    return res.json() as Promise<T>
  }

  const execs = async (q: string) => (await get<{ data: ExecucaoN8n[] }>(`/executions?${q}`)).data ?? []

  return {
    async workflows() {
      const r = await get<{ data: { id: string; name: string; active: boolean }[] }>('/workflows?limit=250')
      return (r.data ?? []).map((w) => ({ id: w.id, name: w.name, active: !!w.active }))
    },
    execucoes: (workflowId, limite) => execs(`workflowId=${encodeURIComponent(workflowId)}&limit=${limite}`),
    execucoesComErro: (limite) => execs(`status=error&limit=${limite}`),
    ultimasExecucoes: (limite) => execs(`limit=${limite}`)
  }
}

export function urlDoN8n(): string {
  return (process.env.N8N_API_URL?.trim() || URL_N8N_PADRAO).replace(/\/$/, '')
}

/** Lanca se o Telegram nao estiver configurado ou recusar — o alerta nao pode sumir em silencio. */
export async function enviarTelegram(html: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chat = process.env.TELEGRAM_ALERTAS_CHAT_ID?.trim()
  if (!token || !chat) throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_ALERTAS_CHAT_ID não configurados')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: html.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15_000)
  })
  if (!res.ok) throw new Error(`Telegram respondeu HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

export const registroPrisma: RegistroAlertas = {
  async filtrarParaEnvio(alertas: Alerta[], agora: Date) {
    const sair: Alerta[] = []
    for (const a of alertas) {
      const existente = await prisma.alertaAutomacao.findUnique({ where: { chave: a.chave } })
      if (!existente) {
        // enviado_em no passado: se o Telegram falhar, o alerta tenta de novo
        // na proxima rodada em vez de ficar marcado como mandado.
        await prisma.alertaAutomacao.create({
          data: {
            chave: a.chave, titulo: a.titulo.slice(0, 200), gravidade: a.gravidade,
            detalhe: a.detalhe.slice(0, 2000), primeiraVezEm: agora, ultimaVezEm: agora, enviadoEm: new Date(0)
          }
        })
        sair.push(a)
        continue
      }
      await prisma.alertaAutomacao.update({
        where: { chave: a.chave },
        data: { vezes: { increment: 1 }, ultimaVezEm: agora, detalhe: a.detalhe.slice(0, 2000), titulo: a.titulo.slice(0, 200) }
      })
      if (agora.getTime() - existente.enviadoEm.getTime() >= a.silencioMin * 60 * 1000) sair.push(a)
    }
    return sair
  },

  async marcarEnviados(chaves: string[], agora: Date) {
    await prisma.alertaAutomacao.updateMany({ where: { chave: { in: chaves } }, data: { enviadoEm: agora } })
  }
}

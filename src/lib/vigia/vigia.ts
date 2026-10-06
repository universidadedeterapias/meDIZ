/**
 * Vigia das automacoes (Story 6.3).
 *
 * Roda a cada 15 minutos como cron da Vercel — fora do n8n de proposito: se o
 * n8n cair, quem avisa nao pode ser ele. Olha duas fontes:
 *
 * - `mensagens_enviadas`, o registro do portao de envio: mensagem repetida,
 *   volume fora do normal, teto do dia, falhas do Chatvolt, reserva presa;
 * - a API do n8n: execucao com erro, fluxo agendado que parou de rodar, n8n
 *   inteiro sem executar nada.
 *
 * Cada alerta tem uma `chave` e um silencio: o mesmo problema so volta para o
 * Telegram depois do silencio dele, mesmo que continue sendo detectado.
 *
 * Banco, n8n e Telegram entram como dependencia para o teste rodar sem nenhum
 * deles (src/scripts/test-vigia.ts).
 */

export type Gravidade = 'critico' | 'atencao'

export type Alerta = {
  chave: string
  gravidade: Gravidade
  titulo: string
  detalhe: string
  /** Minutos ate o mesmo alerta poder sair de novo. */
  silencioMin: number
}

export interface FonteMensagens {
  /** Mesmo telefone e mesmo template enviados mais de uma vez desde `desde`. */
  repetidas(desde: Date): Promise<{ telefone: string; template: string; n: number }[]>
  /** Enviados por fluxo entre `desde` e agora. */
  enviadosPorFluxo(desde: Date): Promise<{ fluxo: string; n: number }[]>
  /** Maior numero de enviados numa mesma hora, por fluxo, entre `desde` e `ate`. */
  maiorHoraPorFluxo(desde: Date, ate: Date): Promise<{ fluxo: string; max: number }[]>
  /** Envios do dia que ocupam o teto, com o teto de cada fluxo. */
  doDiaComTeto(inicioDoDia: Date): Promise<{ fluxo: string; n: number; teto: number }[]>
  /** Barrados por teto diario desde `desde`. */
  barradosPorTeto(desde: Date): Promise<{ fluxo: string; n: number }[]>
  /** falhou e incerto desde `desde`, por fluxo e status, com o ultimo motivo. */
  falhas(desde: Date): Promise<{ fluxo: string; status: string; n: number; motivo: string | null }[]>
  /** Envios parados em `reservado` desde antes de `antesDe`. */
  reservasPresas(antesDe: Date): Promise<{ fluxo: string; n: number }[]>
  /** Contagem por fluxo, status e categoria no intervalo, para o resumo diario. */
  resumo(desde: Date, ate: Date): Promise<{ fluxo: string; status: string; categoria: string | null; n: number }[]>
}

export type ExecucaoN8n = { id: string; workflowId: string; status: string; mode: string; startedAt: string }

export interface FonteN8n {
  /** Todos os workflows, ativos ou nao — os inativos tambem dao nome a erro antigo. */
  workflows(): Promise<{ id: string; name: string; active: boolean }[]>
  execucoes(workflowId: string, limite: number): Promise<ExecucaoN8n[]>
  /** Execucoes com erro, as mais recentes primeiro. */
  execucoesComErro(limite: number): Promise<ExecucaoN8n[]>
  /** As execucoes mais recentes de qualquer workflow. */
  ultimasExecucoes(limite: number): Promise<ExecucaoN8n[]>
}

export interface RegistroAlertas {
  /**
   * Grava que os alertas foram detectados e devolve os que podem sair agora:
   * novos, ou com o silencio vencido.
   */
  filtrarParaEnvio(alertas: Alerta[], agora: Date): Promise<Alerta[]>
  marcarEnviados(chaves: string[], agora: Date): Promise<void>
}

export type DependenciasVigia = {
  mensagens: FonteMensagens
  n8n: FonteN8n | null // null: N8N_API_KEY nao configurada
  registro: RegistroAlertas
  enviarTelegram: (html: string) => Promise<void>
  agora?: () => Date
  urlN8n?: string
}

/**
 * Fluxos agendados e quanto tempo cada um pode ficar sem rodar. So vale para
 * os que estao ativos no n8n: Recuperacao e Despertadores entram sozinhos
 * quando forem religados. A conta e sobre execucoes de agenda (mode
 * 'trigger'), porque webhook tambem gera execucao e esconderia a agenda parada.
 */
export const AGENDADOS: Record<string, { nome: string; silencioMaxMin: number }> = {
  vTURhr3n6CydCslx: { nome: 'Fim do Trial', silencioMaxMin: 75 }, // a cada 30 min
  Xn1lxsDI9XAiA21M: { nome: 'Reativação — envio da onda', silencioMaxMin: 40 }, // a cada 10 min
  SiCcnM4uf3NldK9w: { nome: 'Recuperação de Vendas v2', silencioMaxMin: 25 }, // a cada 5 min
  TWfDbGIWUVYxE3iG: { nome: 'Despertadores', silencioMaxMin: 75 }, // a cada 30 min
  zKjrdJpq5gwhilX4: { nome: 'LIVRO FÍSICO — aviso de rastreio', silencioMaxMin: 20 * 60 }, // 2x ao dia
  Q0fxoZ7kWNqKQdFD: { nome: 'Alimenta Base — Rastreio', silencioMaxMin: 26 * 60 } // 1x ao dia
}

/** O n8n inteiro sem executar nada por este tempo e alerta critico. */
const N8N_PARADO_MIN = 30
/** Volume da ultima hora acima disto e de 3x a maior hora dos 7 dias anteriores. */
const PISO_PICO = 30

const MIN = 60 * 1000

export function inicioDoDiaBrasilia(agora: Date): Date {
  const TRES_HORAS = 3 * 60 * MIN
  const local = new Date(agora.getTime() - TRES_HORAS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + TRES_HORAS)
}

function dataBrasilia(d: Date): string {
  const local = new Date(d.getTime() - 3 * 60 * MIN)
  return local.toISOString().slice(0, 10)
}

function minutosDesde(iso: string, agora: Date): number {
  return Math.round((agora.getTime() - new Date(iso).getTime()) / MIN)
}

function duracao(min: number): string {
  if (min < 120) return `${min} min`
  if (min < 48 * 60) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} dias`
}

export async function alertasDasMensagens(f: FonteMensagens, agora: Date): Promise<Alerta[]> {
  const alertas: Alerta[] = []
  const umaHoraAtras = new Date(agora.getTime() - 60 * MIN)
  const hoje = inicioDoDiaBrasilia(agora)
  const dia = dataBrasilia(agora)

  for (const r of await f.repetidas(new Date(agora.getTime() - 24 * 60 * MIN))) {
    alertas.push({
      chave: `repetida:${r.telefone}:${r.template}`,
      gravidade: 'critico',
      titulo: 'Mensagem repetida',
      detalhe: `${r.template} saiu ${r.n}x para ${r.telefone} nas últimas 24h`,
      silencioMin: 24 * 60
    })
  }

  const ultimaHora = await f.enviadosPorFluxo(umaHoraAtras)
  const maiores = new Map(
    (await f.maiorHoraPorFluxo(new Date(agora.getTime() - 7 * 24 * 60 * MIN), umaHoraAtras)).map((m) => [m.fluxo, m.max])
  )
  for (const u of ultimaHora) {
    const referencia = maiores.get(u.fluxo) ?? 0
    if (u.n > Math.max(PISO_PICO, 3 * referencia)) {
      alertas.push({
        chave: `pico:${u.fluxo}`,
        gravidade: 'critico',
        titulo: `Volume fora do normal: ${u.fluxo}`,
        detalhe: `${u.n} envios na última hora (maior hora dos 7 dias anteriores: ${referencia})`,
        silencioMin: 120
      })
    }
  }

  for (const d of await f.doDiaComTeto(hoje)) {
    if (d.teto > 0 && d.n >= d.teto * 0.8 && d.n < d.teto) {
      alertas.push({
        chave: `teto_perto:${d.fluxo}:${dia}`,
        gravidade: 'atencao',
        titulo: `Perto do teto do dia: ${d.fluxo}`,
        detalhe: `${d.n} de ${d.teto} envios hoje`,
        silencioMin: 24 * 60
      })
    }
  }
  for (const b of await f.barradosPorTeto(hoje)) {
    alertas.push({
      chave: `teto:${b.fluxo}:${dia}`,
      gravidade: 'critico',
      titulo: `Teto do dia atingido: ${b.fluxo}`,
      detalhe: `${b.n} envio(s) barrado(s) hoje. O fluxo segue rodando e tudo volta barrado até amanhã. Se o volume é legítimo, suba teto_diario em fluxos_automacao.`,
      silencioMin: 24 * 60
    })
  }

  for (const x of await f.falhas(umaHoraAtras)) {
    if (x.status === 'incerto') {
      alertas.push({
        chave: `incerto:${x.fluxo}`,
        gravidade: 'critico',
        titulo: `Chatvolt sem resposta: ${x.fluxo}`,
        detalhe: `${x.n} envio(s) sem confirmação na última hora — podem ou não ter chegado, e não são reenviados.${x.motivo ? ' ' + x.motivo : ''}`,
        silencioMin: 60
      })
    } else if (x.n >= 3) {
      alertas.push({
        chave: `falhas:${x.fluxo}`,
        gravidade: 'critico',
        titulo: `Envios falhando: ${x.fluxo}`,
        detalhe: `${x.n} falha(s) na última hora. Última: ${x.motivo ?? 'sem motivo'}`,
        silencioMin: 60
      })
    }
  }

  for (const p of await f.reservasPresas(new Date(agora.getTime() - 10 * MIN))) {
    alertas.push({
      chave: `reserva_presa:${p.fluxo}`,
      gravidade: 'critico',
      titulo: `Envio preso no portão: ${p.fluxo}`,
      detalhe: `${p.n} envio(s) em "reservado" há mais de 10 min — o portão caiu no meio do envio. Não são reenviados.`,
      silencioMin: 60
    })
  }

  return alertas
}

export async function alertasDoN8n(n8n: FonteN8n, agora: Date, urlN8n = ''): Promise<Alerta[]> {
  const alertas: Alerta[] = []

  const ultimas = await n8n.ultimasExecucoes(1)
  const minutosSemNada = ultimas[0] ? minutosDesde(ultimas[0].startedAt, agora) : Infinity
  if (minutosSemNada > N8N_PARADO_MIN) {
    alertas.push({
      chave: 'n8n_parado',
      gravidade: 'critico',
      titulo: 'n8n sem executar nada',
      detalhe: ultimas[0]
        ? `Última execução de qualquer workflow há ${duracao(minutosSemNada)}.`
        : 'Nenhuma execução encontrada.',
      silencioMin: 60
    })
  }

  const todos = await n8n.workflows()
  const ativos = todos.filter((w) => w.active)
  const nomes = new Map(todos.map((w) => [w.id, w.name]))
  for (const w of ativos) {
    const cfg = AGENDADOS[w.id]
    if (!cfg) continue
    const deAgenda = (await n8n.execucoes(w.id, 30)).filter((e) => e.mode === 'trigger')
    const min = deAgenda[0] ? minutosDesde(deAgenda[0].startedAt, agora) : Infinity
    if (min > cfg.silencioMaxMin) {
      alertas.push({
        chave: `parado:${w.id}`,
        gravidade: 'critico',
        titulo: `Fluxo parado: ${cfg.nome}`,
        detalhe: deAgenda[0]
          ? `Está ativo, mas a última rodada agendada foi há ${duracao(min)} (o normal é no máximo ${duracao(cfg.silencioMaxMin)}).`
          : 'Está ativo, mas não há rodada agendada no histórico.',
        silencioMin: 6 * 60
      })
    }
  }

  // 20 min de janela para um cron de 15 cobrir o intervalo inteiro, com folga.
  const recentes = (await n8n.execucoesComErro(100)).filter((e) => minutosDesde(e.startedAt, agora) <= 20)
  const porWorkflow = new Map<string, ExecucaoN8n[]>()
  for (const e of recentes) porWorkflow.set(e.workflowId, [...(porWorkflow.get(e.workflowId) ?? []), e])
  for (const [id, lista] of porWorkflow) {
    alertas.push({
      chave: `erro:${id}`,
      gravidade: 'critico',
      titulo: `Execução com erro: ${nomes.get(id) ?? id}`,
      detalhe: `${lista.length} execução(ões) com erro nos últimos 20 min.${urlN8n ? ` ${urlN8n}/workflow/${id}/executions/${lista[0].id}` : ''}`,
      silencioMin: 60
    })
  }

  return alertas
}

function escapar(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatarAlertas(alertas: Alerta[]): string {
  const ordem = [...alertas].sort((a, b) => (a.gravidade === b.gravidade ? 0 : a.gravidade === 'critico' ? -1 : 1))
  const linhas = ordem.map((a) => `${a.gravidade === 'critico' ? '🔴' : '🟡'} <b>${escapar(a.titulo)}</b>\n${escapar(a.detalhe)}`)
  return `<b>Vigia meDIZ</b> — ${alertas.length} alerta(s)\n\n${linhas.join('\n\n')}`
}

export type ResultadoVigia = { detectados: number; enviados: number; erros: string[] }

export async function executarVigia(deps: DependenciasVigia): Promise<ResultadoVigia> {
  const agora = (deps.agora ?? (() => new Date()))()
  const alertas: Alerta[] = []
  const erros: string[] = []

  try {
    alertas.push(...(await alertasDasMensagens(deps.mensagens, agora)))
  } catch (e) {
    erros.push(`mensagens: ${e instanceof Error ? e.message : e}`)
  }

  if (!deps.n8n) {
    erros.push('n8n: N8N_API_KEY não configurada')
  } else {
    try {
      alertas.push(...(await alertasDoN8n(deps.n8n, agora, deps.urlN8n)))
    } catch (e) {
      // A propria API fora do ar (ou a chave vencida) e um alerta, nao um
      // erro silencioso: sem ela o vigia esta cego para o n8n.
      alertas.push({
        chave: 'n8n_api',
        gravidade: 'critico',
        titulo: 'Vigia sem acesso ao n8n',
        detalhe: `A API do n8n não respondeu: ${e instanceof Error ? e.message : e}. Fluxo parado e erro de execução não estão sendo vigiados.`,
        silencioMin: 60
      })
    }
  }

  const paraEnviar = await deps.registro.filtrarParaEnvio(alertas, agora)
  if (paraEnviar.length) {
    await deps.enviarTelegram(formatarAlertas(paraEnviar))
    await deps.registro.marcarEnviados(paraEnviar.map((a) => a.chave), agora)
  }
  return { detectados: alertas.length, enviados: paraEnviar.length, erros }
}

/** Resumo do dia anterior, mandado uma vez por dia de manha. */
export async function resumoDiario(deps: DependenciasVigia): Promise<string> {
  const agora = (deps.agora ?? (() => new Date()))()
  const ate = inicioDoDiaBrasilia(agora)
  const desde = new Date(ate.getTime() - 24 * 60 * MIN)
  const linhas = await deps.mensagens.resumo(desde, ate)

  const porFluxo = new Map<string, Record<string, number>>()
  const categorias: Record<string, number> = {}
  for (const l of linhas) {
    const f = porFluxo.get(l.fluxo) ?? {}
    f[l.status] = (f[l.status] ?? 0) + l.n
    porFluxo.set(l.fluxo, f)
    if (l.status === 'enviado') categorias[l.categoria ?? 'sem categoria'] = (categorias[l.categoria ?? 'sem categoria'] ?? 0) + l.n
  }

  const partes = [`<b>Resumo das mensagens — ${dataBrasilia(desde).split('-').reverse().join('/')}</b>`]
  if (!porFluxo.size) {
    partes.push('Nenhuma mensagem passou pelo portão.')
  } else {
    for (const [fluxo, s] of [...porFluxo].sort((a, b) => a[0].localeCompare(b[0]))) {
      const extra = ['barrado', 'falhou', 'incerto'].filter((k) => s[k]).map((k) => `${s[k]} ${k}`)
      partes.push(`• ${escapar(fluxo)}: ${s.enviado ?? 0} enviada(s)${extra.length ? ' · ' + extra.join(' · ') : ''}`)
    }
    const cats = Object.entries(categorias).map(([c, n]) => `${n} ${c.toLowerCase()}`)
    if (cats.length) partes.push(`\nPor categoria: ${cats.join(' · ')}`)
  }

  if (deps.n8n) {
    try {
      const erros = (await deps.n8n.execucoesComErro(250)).filter((e) => {
        const t = new Date(e.startedAt).getTime()
        return t >= desde.getTime() && t < ate.getTime()
      })
      if (erros.length) {
        const nomes = new Map((await deps.n8n.workflows()).map((w) => [w.id, w.name]))
        const cont = new Map<string, number>()
        for (const e of erros) cont.set(e.workflowId, (cont.get(e.workflowId) ?? 0) + 1)
        partes.push(`\nExecuções com erro no n8n: ${[...cont].map(([id, n]) => `${escapar(nomes.get(id) ?? id)} (${n})`).join(', ')}`)
      }
    } catch {
      partes.push('\nNão foi possível consultar o n8n.')
    }
  }

  const texto = partes.join('\n')
  await deps.enviarTelegram(texto)
  return texto
}

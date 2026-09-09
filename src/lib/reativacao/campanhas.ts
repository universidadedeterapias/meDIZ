import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { montarTelefone } from '@/lib/phone'
import { resolverSelecao } from './selecao'
import {
  ESTADOS_FORA_DA_REATIVACAO,
  tamanhoAmostra,
  type Amostragem,
  type MapeamentoBotao,
  type MapeamentoVariavel,
  type SelecaoPublico
} from './tipos'

/**
 * Sorteia `n` linhas de `linhas`, sem repetir.
 *
 * Fisher-Yates parcial: so embaralha o suficiente para tirar as `n` primeiras,
 * o resto fica na ordem original e e descartado. Nao precisa ser
 * criptografico — e so uma amostra de marketing, nao uma decisao de
 * seguranca — entao Math.random() basta.
 */
function sorteiaSemReposicao<T>(linhas: T[], n: number): T[] {
  const copia = linhas.slice()
  const limite = Math.min(n, copia.length)
  for (let i = 0; i < limite; i++) {
    const j = i + Math.floor(Math.random() * (copia.length - i))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia.slice(0, limite)
}

/**
 * Ondas de reativacao: materializar, acompanhar, parar.
 *
 * Este arquivo nao envia nada. Ele congela uma lista e a deixa numa fila; quem
 * envia e o n8n, reivindicando lotes. A separacao existe porque envio no meio de
 * um request morre com o request, e onda pela metade nao se retoma sozinha.
 *
 * A lista e materializada uma vez e nunca recalculada. Guardar o filtro em vez
 * da lista faria o publico mudar sozinho entre a aprovacao e o envio.
 */

export const STATUS_CAMPANHA = [
  'rascunho',
  'ativa',
  'pausada',
  'concluida',
  'cancelada'
] as const
export type StatusCampanha = (typeof STATUS_CAMPANHA)[number]

export const ROTULO_STATUS_CAMPANHA: Record<StatusCampanha, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  pausada: 'Pausada',
  concluida: 'Concluída',
  cancelada: 'Cancelada'
}

/** Transicoes permitidas. Uma onda cancelada nao volta: os destinatarios ja
 *  descartados perderam a vez, e ressuscitar a lista sem revisar e o caminho
 *  para disparar duas vezes para a mesma pessoa. */
const TRANSICOES: Record<StatusCampanha, StatusCampanha[]> = {
  rascunho: ['ativa', 'cancelada'],
  ativa: ['pausada', 'concluida', 'cancelada'],
  pausada: ['ativa', 'cancelada'],
  concluida: [],
  cancelada: []
}

export function podeTransicionar(de: string, para: string): boolean {
  const origem = TRANSICOES[de as StatusCampanha]
  return Boolean(origem?.includes(para as StatusCampanha))
}

export type EntradaCampanha = {
  nome: string
  templateName: string
  templateLang: string
  crmScenarioId: string | null
  crmStepId: string | null
  variaveis: MapeamentoVariavel[]
  botao: MapeamentoBotao
  tetoDiario: number
  horaInicio: number
  horaFim: number
  selecao: SelecaoPublico
  amostragem: Amostragem
  criadoPor: string
}

export type ResultadoCriacao = {
  id: string
  totalRecorte: number
  totalDestinatarios: number
  semTelefone: number
  /** Tinha algo em whatsapp, mas montarTelefone() nao conseguiu validar. */
  telefoneInvalido: number
}

/** Curto porque vai num link de WhatsApp, e o link e lido por gente. */
function novoToken(): string {
  return randomBytes(9).toString('base64url')
}

/**
 * Cria a onda e congela a lista.
 *
 * Nasce em `rascunho`: materializar e disparar sao dois atos, e o segundo
 * precisa de alguem olhando o numero do primeiro.
 */
export async function criarCampanha(
  entrada: EntradaCampanha
): Promise<ResultadoCriacao> {
  const doRecorte = await resolverSelecao(entrada.selecao)

  if (doRecorte.length === 0) {
    throw new Error('Nenhuma pessoa selecionada.')
  }

  // A regra absoluta do plano: quem usou o app ontem nao pode receber "volta
  // pro app". Verificada aqui, no CONJUNTO RESOLVIDO — e nao no filtro
  // declarado — porque selecao manual (modo 'lista') nem passa perto de
  // `filtros.estados`. Travar so ali deixaria 'ativo' entrar numa onda
  // marcada a mao.
  const proibidos = doRecorte.filter((l) => ESTADOS_FORA_DA_REATIVACAO.includes(l.estado))
  if (proibidos.length > 0) {
    const emails = proibidos.slice(0, 5).map((p) => p.email).join(', ')
    throw new Error(
      `${proibidos.length} pessoa(s) selecionada(s) está(ão) em estado ativo — ` +
      `mandar "volta pro app" para quem já usa destrói credibilidade: ${emails}` +
      `${proibidos.length > 5 ? '…' : ''}`
    )
  }

  // `todos` mantem a ordem por recencia de sempre. `quantidade` e `percentual`
  // sorteiam: manter a ordem por recencia faria ondas sucessivas do mesmo
  // recorte martelarem sempre as MESMAS pessoas, porque a consulta acima
  // sempre devolve na mesma ordem.
  const n = tamanhoAmostra(entrada.amostragem, doRecorte.length)
  const linhas =
    entrada.amostragem.modo === 'todos' ? doRecorte : sorteiaSemReposicao(doRecorte, n)

  if (linhas.length === 0) {
    throw new Error('A amostragem escolhida não deixou ninguém — aumente a quantidade ou o percentual.')
  }

  const ids = linhas.map((l) => l.user_id)
  const origens = await prisma.$queryRawUnsafe<
    { user_id: string; origens: string[] }[]
  >(
    `SELECT user_id, array_agg(DISTINCT origem) AS origens
       FROM user_origins WHERE user_id = ANY($1::text[]) GROUP BY user_id`,
    ids
  )
  const porUsuario = new Map(origens.map((o) => [o.user_id, o.origens]))

  // O estado sempre e recalculado, nunca armazenado — mesmo na selecao manual
  // (modo 'lista'), onde nao existe um `filtros.corte` por tras.
  const corteUsado = entrada.selecao.modo === 'filtro' ? entrada.selecao.filtros.corte : entrada.selecao.corte

  const campanha = await prisma.reactivationCampaign.create({
    data: {
      nome: entrada.nome,
      templateName: entrada.templateName,
      templateLang: entrada.templateLang,
      crmScenarioId: entrada.crmScenarioId,
      crmStepId: entrada.crmStepId,
      variaveis: entrada.variaveis as unknown as object,
      botao: (entrada.botao ?? undefined) as unknown as object | undefined,
      filtros: entrada.selecao as unknown as object,
      corteDias: corteUsado,
      selecaoModo: entrada.selecao.modo,
      amostragemModo: entrada.amostragem.modo,
      amostragemValor: entrada.amostragem.modo === 'todos' ? null : entrada.amostragem.valor,
      tetoDiario: entrada.tetoDiario,
      horaInicio: entrada.horaInicio,
      horaFim: entrada.horaFim,
      criadoPor: entrada.criadoPor,
      totalRecorte: doRecorte.length,
      totalDestinatarios: linhas.length
    }
  })

  // Quem nao tem telefone entra como `descartado`, e nao fica de fora em
  // silencio: o numero da lista tem que bater com o numero que o operador
  // aprovou, e a diferenca precisa ter nome.
  //
  // `User.whatsapp` e gravado cru em varios cadastros (signup, /api/user,
  // edicao no admin) — nenhum deles passa por `montarTelefone`. Auditado em
  // producao: 2.393 de 2.473 numeros (97%) estao como "(11) 93728-4567", sem
  // o DDI. So os que vieram de um webhook de compra (Guru/Hotmart), que ja
  // normaliza na entrada, escapam disso. Sem este passo, quase toda onda saia
  // com `to` sem 55 — a Meta recusa ou entrega para o numero errado.
  let semTelefone = 0
  let telefoneInvalido = 0
  const dados = linhas.map((l) => {
    const bruto = l.whatsapp?.trim() || null
    const telefone = bruto ? montarTelefone({ numero: bruto }) : null
    if (!bruto) semTelefone += 1
    else if (!telefone) telefoneInvalido += 1
    return {
      campaignId: campanha.id,
      userId: l.user_id,
      email: l.email,
      nome: l.nome,
      telefone,
      idioma: l.idioma,
      estado: l.estado,
      origens: porUsuario.get(l.user_id) ?? [],
      status: telefone ? 'pendente' : 'descartado',
      motivo: telefone ? null : bruto ? 'telefone inválido' : 'sem telefone',
      trackToken: novoToken()
    }
  })

  await prisma.reactivationRecipient.createMany({ data: dados })

  return {
    id: campanha.id,
    totalRecorte: doRecorte.length,
    totalDestinatarios: linhas.length,
    semTelefone,
    telefoneInvalido
  }
}

export type MetricasCampanha = {
  total: number
  pendente: number
  enviando: number
  enviado: number
  falhou: number
  descartado: number
  /** Dos descartados: motivo = 'sem telefone'. */
  semTelefone: number
  /** Dos descartados: motivo = 'telefone inválido' — tinha algo no campo mas
   *  montarTelefone() nao validou. O resto do `descartado` (ex.: onda
   *  cancelada) nao tem contador proprio. */
  telefoneInvalido: number
  clicou: number
  acessou: number
  /** Acesso que nao veio pelo link: rastro de uso depois do envio. Conta como
   *  reativacao, mesmo sem clique atribuido. */
  acessouPorRastro: number
}

export async function metricasDaCampanha(
  campaignId: string
): Promise<MetricasCampanha> {
  const linhas = await prisma.$queryRawUnsafe<
    {
      total: bigint
      pendente: bigint
      enviando: bigint
      enviado: bigint
      falhou: bigint
      descartado: bigint
      sem_telefone: bigint
      telefone_invalido: bigint
      clicou: bigint
      acessou: bigint
      acessou_por_rastro: bigint
    }[]
  >(
    `SELECT count(*)                                            AS total,
            count(*) FILTER (WHERE r.status = 'pendente')       AS pendente,
            count(*) FILTER (WHERE r.status = 'enviando')       AS enviando,
            count(*) FILTER (WHERE r.status = 'enviado')        AS enviado,
            count(*) FILTER (WHERE r.status = 'falhou')         AS falhou,
            count(*) FILTER (WHERE r.status = 'descartado')     AS descartado,
            count(*) FILTER (WHERE r.motivo = 'sem telefone')      AS sem_telefone,
            count(*) FILTER (WHERE r.motivo = 'telefone inválido') AS telefone_invalido,
            count(*) FILTER (WHERE r.clicou_em IS NOT NULL)     AS clicou,
            count(*) FILTER (WHERE r.acessou_em IS NOT NULL)    AS acessou,
            count(*) FILTER (WHERE r.acessou_em IS NULL
                               AND r.enviado_em IS NOT NULL
                               AND ls.ultimo_sinal_em > r.enviado_em) AS acessou_por_rastro
       FROM reactivation_recipients r
       LEFT JOIN user_last_seen ls ON ls.user_id = r.user_id
      WHERE r.campaign_id = $1`,
    campaignId
  )
  const l = linhas[0]
  const n = (v: bigint | null) => Number(v ?? 0)
  return {
    total: n(l?.total ?? null),
    pendente: n(l?.pendente ?? null),
    enviando: n(l?.enviando ?? null),
    enviado: n(l?.enviado ?? null),
    falhou: n(l?.falhou ?? null),
    descartado: n(l?.descartado ?? null),
    semTelefone: n(l?.sem_telefone ?? null),
    telefoneInvalido: n(l?.telefone_invalido ?? null),
    clicou: n(l?.clicou ?? null),
    acessou: n(l?.acessou ?? null),
    acessouPorRastro: n(l?.acessou_por_rastro ?? null)
  }
}

/** Quantos ja sairam hoje. E o que o teto diario limita. */
export async function enviadosHoje(campaignId: string): Promise<number> {
  const r = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
    `SELECT count(*) AS total
       FROM reactivation_recipients
      WHERE campaign_id = $1
        AND enviado_em >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')`,
    campaignId
  )
  return Number(r[0]?.total ?? 0)
}

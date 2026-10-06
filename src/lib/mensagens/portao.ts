/**
 * Portao de envio (Story 6.1): o unico caminho para mandar template pago do
 * WhatsApp.
 *
 * Os fluxos do n8n continuam decidindo QUEM recebe e QUANDO. O portao decide
 * se a mensagem PODE sair, e registra o que saiu. A ordem importa:
 *
 *   1. grava a chave (`mensagens_enviadas.chave` e unica). Se ja existe e nao
 *      e uma falha que vale repetir, devolve `ja_enviado` sem enviar;
 *   2. fluxo cadastrado e ligado? dentro do teto do dia? a pessoa ainda nao
 *      bateu o limite de 24h? Se nao, `barrado`;
 *   3. so entao chama o Chatvolt, e grava o resultado.
 *
 * Gravar antes de enviar e o que impede o reenvio. Em 05/10/2026 o fim do
 * trial enviava e so depois registrava; o registro falhava, e a mesma pessoa
 * voltava como candidata a cada 30 minutos. Aqui, um registro que falha
 * depois do envio nao abre a porta de novo: a chave ja esta la.
 *
 * Na duvida, nao envia. Se o Chatvolt nao responde a tempo, a mensagem pode
 * ter saido; o envio fica `incerto` e a chave nao e liberada para nova
 * tentativa. Perder um aviso custa menos que mandar dois.
 *
 * Banco e Chatvolt entram como dependencia para o teste rodar sem nenhum dos
 * dois (src/scripts/test-portao-envio.ts).
 */

export type StatusEnvio = 'reservado' | 'enviado' | 'barrado' | 'falhou' | 'incerto'

export type ResultadoPortao =
  | 'enviado' // saiu agora
  | 'ja_enviado' // a chave ja tinha saido (ou pode ter saido): nada foi enviado
  | 'barrado' // regra do portao segurou: nada foi enviado
  | 'falhou' // o Chatvolt recusou ou caiu: pode tentar de novo com a mesma chave
  | 'incerto' // o Chatvolt nao respondeu a tempo: NAO tente de novo

/** Corpo do POST /whatsapp/{waba}/template-message, como os fluxos ja montam. */
export type CorpoTemplate = {
  to: string
  agentId?: string
  templateName: string
  templateLangCode?: string
  text?: string
  buttons?: unknown[]
  [variavel: `var_${number}`]: string | undefined
}

export type PedidoEnvio = {
  fluxo: string
  chave: string
  userId?: string | null
  corpo: CorpoTemplate
  n8nWorkflowId?: string | null
  n8nExecucaoId?: string | null
}

export type ConfigFluxo = {
  fluxo: string
  ligado: boolean
  tetoDiario: number
  contaNoLimitePessoa: boolean
  limitePessoa24h: number
}

export type EnvioExistente = {
  id: string
  status: StatusEnvio
  motivo: string | null
  conversationId: string | null
}

export type Reserva =
  | { tipo: 'nova'; id: string }
  | { tipo: 'retentativa'; id: string }
  | { tipo: 'existente'; envio: EnvioExistente }

export type Finalizacao = {
  status: Exclude<StatusEnvio, 'reservado'>
  motivo?: string | null
  httpStatus?: number | null
  resposta?: unknown
  conversationId?: string | null
  categoria?: string | null
  enviadoEm?: Date | null
}

export interface RepositorioPortao {
  /**
   * Grava a chave como `reservado`. Chave nova cria a linha; chave que existe
   * com status `falhou` ou `barrado` volta para `reservado` (retentativa);
   * qualquer outro status devolve o envio existente sem mexer nele. Precisa
   * ser atomico: duas chamadas simultaneas com a mesma chave nao podem as
   * duas sair daqui com a reserva.
   */
  reservar(pedido: PedidoNormalizado, agora: Date): Promise<Reserva>
  buscarFluxo(fluxo: string): Promise<ConfigFluxo | null>
  /** Envios do fluxo desde `desde` que ocupam o teto (reservado, enviado, incerto). */
  contarDoFluxo(fluxo: string, desde: Date, excetoId: string): Promise<number>
  /** Idem, por telefone, so de fluxos com conta_no_limite_pessoa. */
  contarDaPessoa(telefone: string, desde: Date, excetoId: string): Promise<number>
  finalizar(id: string, dados: Finalizacao): Promise<void>
}

export type RespostaCanal =
  | { tipo: 'aceito'; httpStatus: number; corpo: unknown }
  | { tipo: 'recusado'; httpStatus: number; corpo: unknown } // 4xx: nao adianta repetir igual
  | { tipo: 'erro_servidor'; httpStatus: number; corpo: unknown } // 5xx: nao saiu
  | { tipo: 'sem_conexao'; erro: string } // nem conectou: nao saiu
  | { tipo: 'sem_resposta'; erro: string } // conectou e nao respondeu: pode ter saido

export interface CanalTemplate {
  enviar(corpo: CorpoTemplate): Promise<RespostaCanal>
}

export type DependenciasPortao = {
  repo: RepositorioPortao
  canal: CanalTemplate
  agora?: () => Date
  /** Categoria do template na Meta, para estimar custo. Falha vira null. */
  categoriaDoTemplate?: (template: string) => Promise<string | null>
  agentIdPadrao?: string
}

export type PedidoNormalizado = Omit<PedidoEnvio, 'corpo'> & {
  telefone: string
  corpo: CorpoTemplate
}

export type RespostaPortao = {
  status: ResultadoPortao
  motivo: string | null
  envioId: string
  conversationId: string | null
  httpStatus: number | null
  /** Corpo do Chatvolt, quando houve chamada — os fluxos leem messages[0]. */
  chatvolt: unknown
}

const CHAVES_DO_CORPO = new Set(['to', 'agentId', 'templateName', 'templateLangCode', 'text', 'buttons'])
const VARIAVEL = /^var_\d{1,2}$/

export class PedidoInvalido extends Error {}

/**
 * Telefone so com digitos, com DDI. Os fluxos ja mandam assim; aqui so confere.
 * O minimo e 11 porque a Entrega de Acesso atende EUA e Canada (DDI 1 + 10
 * digitos). Numero brasileiro sem DDI tem 10 ou 11 digitos: o de 10 e barrado
 * aqui, o de 11 passa — quem monta o telefone e que garante o DDI.
 */
export function normalizarTelefone(bruto: string): string {
  const digitos = String(bruto || '').replace(/\D/g, '')
  if (digitos.length < 11 || digitos.length > 15) {
    throw new PedidoInvalido(`telefone invalido: precisa ter DDI e 11 a 15 digitos (veio ${digitos.length})`)
  }
  return digitos
}

/**
 * So passa adiante o que o endpoint de template do Chatvolt entende. Campo a
 * mais no corpo do fluxo (rotulos internos, ids de CRM) nao vai para fora.
 */
export function limparCorpo(corpo: Record<string, unknown>, telefone: string, agentIdPadrao?: string): CorpoTemplate {
  const limpo: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(corpo)) {
    if (v === undefined || v === null) continue
    if (CHAVES_DO_CORPO.has(k)) limpo[k] = v
    else if (VARIAVEL.test(k)) limpo[k] = String(v)
  }
  limpo.to = telefone
  if (!limpo.agentId && agentIdPadrao) limpo.agentId = agentIdPadrao
  if (typeof limpo.templateName !== 'string' || !limpo.templateName.trim()) {
    throw new PedidoInvalido('corpo.templateName e obrigatorio')
  }
  return limpo as CorpoTemplate
}

/** Meia-noite de hoje em Brasilia (UTC-3, sem horario de verao desde 2019). */
export function inicioDoDiaBrasilia(agora: Date): Date {
  const TRES_HORAS = 3 * 60 * 60 * 1000
  const local = new Date(agora.getTime() - TRES_HORAS)
  const meiaNoiteLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  return new Date(meiaNoiteLocal + TRES_HORAS)
}

function conversationIdDe(corpo: unknown): string | null {
  if (!corpo || typeof corpo !== 'object') return null
  const c = corpo as { messages?: Array<{ conversationId?: unknown }>; conversationId?: unknown }
  const id = c.messages?.[0]?.conversationId ?? c.conversationId
  return typeof id === 'string' && id ? id : null
}

function resumo(corpo: unknown): string {
  try {
    return (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)).slice(0, 180)
  } catch {
    return ''
  }
}

export async function enviarPeloPortao(pedido: PedidoEnvio, deps: DependenciasPortao): Promise<RespostaPortao> {
  const agora = (deps.agora ?? (() => new Date()))()
  const telefone = normalizarTelefone(pedido.corpo?.to)
  const corpo = limparCorpo(pedido.corpo as Record<string, unknown>, telefone, deps.agentIdPadrao)
  const normalizado: PedidoNormalizado = { ...pedido, telefone, corpo }

  // 1. A chave antes de tudo.
  const reserva = await deps.repo.reservar(normalizado, agora)
  if (reserva.tipo === 'existente') {
    const e = reserva.envio
    return {
      status: e.status === 'incerto' ? 'incerto' : 'ja_enviado',
      motivo:
        e.status === 'incerto'
          ? 'tentativa anterior sem confirmacao do Chatvolt; nao reenviado'
          : `chave ja usada (status ${e.status})`,
      envioId: e.id,
      conversationId: e.conversationId,
      httpStatus: null,
      chatvolt: null
    }
  }
  const id = reserva.id

  const barrar = async (motivo: string): Promise<RespostaPortao> => {
    await deps.repo.finalizar(id, { status: 'barrado', motivo })
    return { status: 'barrado', motivo, envioId: id, conversationId: null, httpStatus: null, chatvolt: null }
  }

  // 2. As regras.
  const fluxo = await deps.repo.buscarFluxo(pedido.fluxo)
  if (!fluxo) return barrar(`fluxo '${pedido.fluxo}' nao cadastrado em fluxos_automacao`)
  if (!fluxo.ligado) return barrar('fluxo desligado')

  const doDia = await deps.repo.contarDoFluxo(fluxo.fluxo, inicioDoDiaBrasilia(agora), id)
  if (doDia >= fluxo.tetoDiario) return barrar(`teto diario do fluxo atingido (${fluxo.tetoDiario})`)

  if (fluxo.contaNoLimitePessoa) {
    const desde = new Date(agora.getTime() - 24 * 60 * 60 * 1000)
    const daPessoa = await deps.repo.contarDaPessoa(telefone, desde, id)
    if (daPessoa >= fluxo.limitePessoa24h) {
      return barrar(`pessoa ja recebeu ${daPessoa} mensagem(ns) nas ultimas 24h (limite ${fluxo.limitePessoa24h})`)
    }
  }

  // 3. O envio.
  const categoria = deps.categoriaDoTemplate
    ? await deps.categoriaDoTemplate(corpo.templateName).catch(() => null)
    : null
  const r = await deps.canal.enviar(corpo)

  if (r.tipo === 'aceito') {
    const conversationId = conversationIdDe(r.corpo)
    await deps.repo.finalizar(id, {
      status: 'enviado',
      httpStatus: r.httpStatus,
      resposta: r.corpo,
      conversationId,
      categoria,
      enviadoEm: agora
    })
    return { status: 'enviado', motivo: null, envioId: id, conversationId, httpStatus: r.httpStatus, chatvolt: r.corpo }
  }

  if (r.tipo === 'sem_resposta') {
    const motivo = `Chatvolt sem resposta: ${r.erro}`.slice(0, 250)
    await deps.repo.finalizar(id, { status: 'incerto', motivo, categoria })
    return { status: 'incerto', motivo, envioId: id, conversationId: null, httpStatus: null, chatvolt: null }
  }

  const motivo =
    r.tipo === 'sem_conexao'
      ? `sem conexao com o Chatvolt: ${r.erro}`
      : `Chatvolt ${r.tipo === 'recusado' ? 'recusou' : 'falhou'} (HTTP ${r.httpStatus}): ${resumo(r.corpo)}`
  const httpStatus = r.tipo === 'sem_conexao' ? null : r.httpStatus
  await deps.repo.finalizar(id, {
    status: 'falhou',
    motivo: motivo.slice(0, 250),
    httpStatus,
    resposta: r.tipo === 'sem_conexao' ? null : r.corpo,
    categoria
  })
  return {
    status: 'falhou',
    motivo: motivo.slice(0, 250),
    envioId: id,
    conversationId: null,
    httpStatus,
    chatvolt: r.tipo === 'sem_conexao' ? null : r.corpo
  }
}

/**
 * Cliente fino da API do Chatvolt.
 *
 * Leitura (cenários de CRM, etapas e templates de WhatsApp aprovados na Meta):
 * usada no admin para popular os seletores da criação de onda em vez de exigir
 * ID/nome digitado à mão.
 *
 * Envio de template: só o portão de envio (src/lib/mensagens/portao.ts) chama
 * `enviarTemplate`. Fluxo nenhum deve mandar template direto — é o portão que
 * impede reenvio e aplica os tetos. Mudança de etapa no CRM continua no n8n.
 */

const BASE_URL = 'https://api.chatvolt.ai'

function apiKey(): string {
  const key = process.env.CHATVOLT_API_KEY
  if (!key) throw new Error('CHATVOLT_API_KEY não configurada')
  return key
}

function agentId(): string {
  const id = process.env.CHATVOLT_AGENT_ID
  if (!id) throw new Error('CHATVOLT_AGENT_ID não configurado')
  return id
}

async function chatvoltGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, BASE_URL)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: 'no-store'
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    throw new Error(`Chatvolt ${path} respondeu ${res.status}: ${corpo.slice(0, 300)}`)
  }

  return res.json()
}

export type ChatvoltScenario = {
  id: string
  name: string
  description: string | null
}

export type ChatvoltStep = {
  id: string
  name: string
  scenarioId: string
}

export type ChatvoltTemplate = {
  id: string
  name: string
  language: string
  status: string
  category: string
}

export async function listScenarios(): Promise<ChatvoltScenario[]> {
  return chatvoltGet<ChatvoltScenario[]>('/crm/scenario', { agentId: agentId() })
}

export async function listSteps(scenarioId: string): Promise<ChatvoltStep[]> {
  // Sem agentId de proposito: é opcional na doc, mas passar ele aqui volta
  // [] pra alguns cenarios que tem etapa de verdade (confirmado comparando
  // com/sem o parametro no mesmo scenarioId) — parece um filtro instavel do
  // lado do Chatvolt. scenarioId sozinho ja restringe o suficiente.
  return chatvoltGet<ChatvoltStep[]>('/crm/step', { scenarioId })
}

export async function listTemplates(): Promise<ChatvoltTemplate[]> {
  const json = await chatvoltGet<{ data: ChatvoltTemplate[] }>('/whatsapp/templates', {
    agentId: agentId()
  })
  return json.data ?? []
}

/**
 * Número de WhatsApp (WABA) da API oficial. Todos os fluxos usam o mesmo hoje;
 * a env existe para trocar sem deploy de código.
 */
export function wabaId(): string {
  return process.env.CHATVOLT_WABA_ID?.trim() || '1312217107345989'
}

export function agentIdPadrao(): string | undefined {
  return process.env.CHATVOLT_AGENT_ID?.trim() || undefined
}

export type RespostaEnvioTemplate =
  | { tipo: 'aceito'; httpStatus: number; corpo: unknown }
  | { tipo: 'recusado'; httpStatus: number; corpo: unknown }
  | { tipo: 'erro_servidor'; httpStatus: number; corpo: unknown }
  | { tipo: 'sem_conexao'; erro: string }
  | { tipo: 'sem_resposta'; erro: string }

/**
 * POST /whatsapp/{waba}/template-message. Nunca lança: o portão precisa saber
 * a diferença entre "não saiu" (recusado, erro do servidor, sem conexão) e
 * "pode ter saído" (sem resposta dentro do prazo), porque só o primeiro pode
 * ser tentado de novo.
 */
export async function enviarTemplate(
  corpo: Record<string, unknown>,
  timeoutMs = 20_000
): Promise<RespostaEnvioTemplate> {
  return postar(`/whatsapp/${wabaId()}/template-message`, corpo, timeoutMs)
}

/**
 * Texto livre por um numero da Z-API, pelo Chatvolt — a conversa nasce no
 * Chatvolt e o agente assume as respostas. Mesma regra do template: nunca
 * lanca, e diferencia "nao saiu" de "pode ter saido".
 */
export async function enviarTextoZapi(
  instancia: string,
  telefone: string,
  mensagem: string,
  timeoutMs = 20_000
): Promise<RespostaEnvioTemplate> {
  return postar(
    `/zapi/${encodeURIComponent(instancia)}/${encodeURIComponent(telefone)}/message`,
    { message: mensagem },
    timeoutMs
  )
}

async function postar(
  caminho: string,
  corpo: Record<string, unknown>,
  timeoutMs: number
): Promise<RespostaEnvioTemplate> {
  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${caminho}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      cache: 'no-store',
      signal: controle.signal
    })
  } catch (e) {
    clearTimeout(relogio)
    const erro = e instanceof Error ? e.message : String(e)
    // Abort = o pedido foi feito e a resposta não veio a tempo. Qualquer outro
    // erro aqui é de rede antes da resposta (DNS, conexão recusada): não saiu.
    if (controle.signal.aborted) return { tipo: 'sem_resposta', erro: `sem resposta em ${timeoutMs}ms` }
    return { tipo: 'sem_conexao', erro }
  }

  let corpoResposta: unknown
  try {
    const texto = await res.text()
    try {
      corpoResposta = JSON.parse(texto)
    } catch {
      corpoResposta = texto
    }
  } catch (e) {
    clearTimeout(relogio)
    // O status chegou mas o corpo não: com 2xx, saiu.
    if (res.ok) return { tipo: 'aceito', httpStatus: res.status, corpo: null }
    corpoResposta = e instanceof Error ? e.message : String(e)
  }
  clearTimeout(relogio)

  if (res.ok) return { tipo: 'aceito', httpStatus: res.status, corpo: corpoResposta }
  if (res.status >= 500) return { tipo: 'erro_servidor', httpStatus: res.status, corpo: corpoResposta }
  return { tipo: 'recusado', httpStatus: res.status, corpo: corpoResposta }
}

let categorias: { em: number; porNome: Map<string, string> } | null = null

/**
 * Categoria do template na Meta (MARKETING, UTILITY...), para estimar custo.
 * Lista os templates no máximo a cada 10 minutos. Falha devolve null — custo
 * desconhecido não segura envio.
 */
export async function categoriaDoTemplate(nome: string): Promise<string | null> {
  const DEZ_MINUTOS = 10 * 60 * 1000
  if (!categorias || Date.now() - categorias.em > DEZ_MINUTOS) {
    try {
      const lista = await listTemplates()
      const porNome = new Map<string, string>()
      for (const t of lista) if (t.name && t.category && !porNome.has(t.name)) porNome.set(t.name, t.category)
      categorias = { em: Date.now(), porNome }
    } catch {
      return categorias?.porNome.get(nome) ?? null
    }
  }
  return categorias.porNome.get(nome) ?? null
}

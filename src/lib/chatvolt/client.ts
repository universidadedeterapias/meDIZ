/**
 * Cliente fino da API do Chatvolt, só leitura (cenários de CRM, etapas e
 * templates de WhatsApp aprovados na Meta) — usado no admin para popular os
 * seletores da criação de onda em vez de exigir ID/nome digitado à mão.
 *
 * O disparo de verdade (mensagem, mudança de etapa) continua no n8n; isto
 * aqui é só consulta, chamada direto pelo Next quando o admin abre o diálogo.
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
  return chatvoltGet<ChatvoltStep[]>('/crm/step', { scenarioId, agentId: agentId() })
}

export async function listTemplates(): Promise<ChatvoltTemplate[]> {
  const json = await chatvoltGet<{ data: ChatvoltTemplate[] }>('/whatsapp/templates', {
    agentId: agentId()
  })
  return json.data ?? []
}

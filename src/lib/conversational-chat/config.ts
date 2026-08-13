import type { ChatKind } from '@prisma/client'

export type ConversationalChatKind = Extract<
  ChatKind,
  'SEARCH' | 'SIMULADOR' | 'PROF'
>

export type SpecialistAgent = 'body' | 'home' | 'pet'
export type MedizAgent = 'concierge' | SpecialistAgent
export type ConciergeEntryPoint = 'free' | 'pain' | 'talk' | 'research'
export type ConciergeDestination =
  | 'medizpesquisa'
  | 'minha_casa'
  | 'meu_pet'
  | 'meatende'
  | 'simulador'
  | 'professor'
  | 'indefinido'

export type ConciergeRouteStatus =
  | 'collecting'
  | 'awaiting_confirmation'
  | 'ready_to_route'
  | 'needs_selection'

export function destinationToSpecialist(
  destination: ConciergeDestination
): SpecialistAgent | null {
  if (destination === 'medizpesquisa') return 'body'
  if (destination === 'minha_casa') return 'home'
  if (destination === 'meu_pet') return 'pet'
  return null
}

const AGENT_WELCOME_MESSAGES: Record<MedizAgent, string> = {
  concierge: 'Conte o que está acontecendo. Eu vou encontrar o melhor caminho para você.',
  body: 'O que você está sentindo e gostaria de compreender melhor?',
  home: 'O que aconteceu na sua casa e chamou a sua atenção?',
  pet: 'O que você percebeu no seu pet e gostaria de compreender melhor?'
}

export function getAgentWelcomeMessage(agent: MedizAgent): string {
  return AGENT_WELCOME_MESSAGES[agent]
}

export function getConciergeEntryMessage(entryPoint: ConciergeEntryPoint) {
  if (entryPoint === 'pain') return 'Sinto muito. Pode me falar mais sobre essa dor?'
  if (entryPoint === 'talk') return 'Estou aqui. Sobre o que você quer conversar?'
  if (entryPoint === 'research') return 'Claro! Sobre o que você quer pesquisar?'
  return getAgentWelcomeMessage('concierge')
}

export const CONVERSATIONAL_CHAT_WEBHOOKS: Record<
  ConversationalChatKind,
  { envKey: string; fallbackUrl: string }
> = {
  SEARCH: {
    envKey: 'N8N_CHAT_WEBHOOK_URL_V2',
    fallbackUrl:
      'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-texto-v2'
  },
  SIMULADOR: {
    envKey: 'N8N_SIMULADOR_WEBHOOK_URL',
    fallbackUrl:
      'https://mediz-n8n.gjhi7d.easypanel.host/webhook/3bfec4b0-7cf7-443c-a73f-e4dcfa899c7c'
  },
  PROF: {
    envKey: 'N8N_PROFESSOR_PAULO_WEBHOOK_URL',
    fallbackUrl:
      'https://mediz-n8n.gjhi7d.easypanel.host/webhook/c7d2b3a1-a8a6-4b70-9e2d-77c66b3a7173'
  }
}

export function getConversationalWebhookUrl(
  chatKind: ConversationalChatKind
): string {
  const config = CONVERSATIONAL_CHAT_WEBHOOKS[chatKind]
  const fromEnv =
    process.env[config.envKey]?.trim() ||
    (chatKind === 'SIMULADOR'
      ? process.env.N8N_MEATENDE_WEBHOOK_URL?.trim()
      : undefined)
  return fromEnv || config.fallbackUrl
}

const TRANSCRIBE_WEBHOOK_ENV_KEY = 'N8N_TRANSCRIBE_WEBHOOK_URL'
const TRANSCRIBE_WEBHOOK_FALLBACK_URL =
  'https://mediz-n8n.gjhi7d.easypanel.host/webhook/transcrever-audio'

export function getTranscribeWebhookUrl(): string {
  return process.env[TRANSCRIBE_WEBHOOK_ENV_KEY]?.trim() || TRANSCRIBE_WEBHOOK_FALLBACK_URL
}

export function isConversationalChatKind(
  value: string
): value is ConversationalChatKind {
  return value === 'SEARCH' || value === 'SIMULADOR' || value === 'PROF'
}

/**
 * Modo pesquisa por sintoma (`/pesquisa`): o chat legado de relatorio estruturado,
 * atendido por `/api/openai` e pelo webhook `chat-texto`. Nao e um chat conversacional —
 * fica de fora de `ConversationalChatKind` de proposito, pra que o POST de
 * `/api/conversational-chat` continue rejeitando esse kind (nao existe webhook v2 pra ele
 * em `CONVERSATIONAL_CHAT_WEBHOOKS`).
 */
export const SYMPTOM_SEARCH_CHAT_KIND = 'SYMPTOM_SEARCH' as const

/**
 * Kinds que a tela de historico pode listar — inclui o modo pesquisa, que so e legivel,
 * nunca gravavel pela rota conversacional.
 */
export type HistoryChatKind =
  | ConversationalChatKind
  | typeof SYMPTOM_SEARCH_CHAT_KIND

export function isHistoryChatKind(value: string): value is HistoryChatKind {
  return isConversationalChatKind(value) || value === SYMPTOM_SEARCH_CHAT_KIND
}

/**
 * Kinds que consomem a cota diaria do plano gratuito (`getUserLimits().searchLimit`).
 * Chat conversacional e modo pesquisa dividem o mesmo teto: gastar num lado reduz o outro.
 * Simulador e professor tem gate proprio (premium) e ficam de fora.
 */
export const FREE_DAILY_QUOTA_CHAT_KINDS = [
  'SEARCH',
  SYMPTOM_SEARCH_CHAT_KIND
] as const satisfies readonly ChatKind[]

export function isMedizAgent(value: string): value is MedizAgent {
  return value === 'concierge' || isSpecialistAgent(value)
}

export function isSpecialistAgent(value: string): value is SpecialistAgent {
  return value === 'body' || value === 'home' || value === 'pet'
}

/**
 * Todo agente conversacional com prompt hoje mantido no n8n (concierge/specialists via
 * chat kind SEARCH, mais simulador e professor). Chave usada em `AgentPromptConfig`.
 */
export type ConversationalAgentId = MedizAgent | 'simulador' | 'professor'

export const CONVERSATIONAL_AGENT_IDS: readonly ConversationalAgentId[] = [
  'concierge',
  'body',
  'home',
  'pet',
  'simulador',
  'professor'
]

export function isConversationalAgentId(
  value: string
): value is ConversationalAgentId {
  return (
    isMedizAgent(value) || value === 'simulador' || value === 'professor'
  )
}

/**
 * Painel de teste de prompt dos agentes (editar/salvar no banco direto pela tela /chat).
 * So deve ser ligado em HML — nunca em producao.
 */
export function isAgentPromptTestModeEnabled(): boolean {
  return process.env.AGENT_PROMPT_TEST_MODE === 'true'
}

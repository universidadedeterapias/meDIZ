export type AssistantHandoffTarget = 'professor-paulo' | 'meatende'

export type AssistantHandoffPayload = {
  message: string
  preview: string
  sourceThreadId?: string
  createdAt: string
}

export const ASSISTANT_HANDOFF_STORAGE_KEYS: Record<AssistantHandoffTarget, string> = {
  'professor-paulo': 'assistant-handoff:professor-paulo',
  meatende: 'assistant-handoff:meatende'
}

export const ASSISTANT_HANDOFF_ROUTES: Record<AssistantHandoffTarget, string> = {
  'professor-paulo': '/professor-paulo',
  meatende: '/meatende'
}

const MAX_HANDOFF_MARKDOWN_LENGTH = 12000

export function buildAssistantHandoffMessage({
  question,
  resultMarkdown
}: {
  question: string
  resultMarkdown: string
}) {
  const normalizedQuestion = question.trim() || 'Pergunta não informada'
  const normalizedMarkdown = resultMarkdown.trim()
  const truncatedMarkdown =
    normalizedMarkdown.length > MAX_HANDOFF_MARKDOWN_LENGTH
      ? `${normalizedMarkdown.slice(0, MAX_HANDOFF_MARKDOWN_LENGTH)}\n\n[conteúdo truncado para encaminhamento]`
      : normalizedMarkdown

  return [
    'Contexto encaminhado automaticamente do chat principal do meDIZ.',
    '',
    'Pergunta original do usuário:',
    normalizedQuestion,
    '',
    'Resultado do meDIZ:',
    truncatedMarkdown,
    '',
    'Instrução: continue a conversa considerando o contexto acima, sem repetir integralmente o texto.'
  ].join('\n')
}

export type AssistantHandoffTarget = 'professor-paulo' | 'meatende'

export type AssistantHandoffPayload = {
  message: string
  preview: string
  sourceQuestion: string
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

const MAX_HANDOFF_MARKDOWN_LENGTH = 5000

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
    'Pergunta original da pesquisa:',
    normalizedQuestion,
    '',
    'Resumo do resultado meDIZ (usar como base de continuidade):',
    truncatedMarkdown,
    '',
    'Instrução obrigatória: continue a conversa a partir desse contexto, sem reiniciar a anamnese do zero e sem pedir novamente o sintoma principal já informado.'
  ].join('\n')
}

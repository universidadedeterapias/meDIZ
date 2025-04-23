export interface OpenAIMessage {
  id: string
  object: 'thread.message'
  created_at: number
  assistant_id: string
  thread_id: string
  run_id?: string
  role: 'user' | 'assistant'
  content: Array<{
    type: 'text'
    text: {
      value: string
      annotations: Array<unknown> // pode tipar melhor se quiser processar anotações
    }
  }>
  attachments: unknown[] // pode detalhar se for usar
  metadata: Record<string, unknown>
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCcw, Save, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'
import {
  CONVERSATIONAL_AGENT_IDS,
  type ConversationalAgentId
} from '@/lib/conversational-chat/config'

type PromptResponse = {
  agent: ConversationalAgentId
  prompt: string
}

const AGENT_LABELS: Record<ConversationalAgentId, string> = {
  concierge: 'Concierge (porteiro)',
  body: 'Corpo (medizpesquisa)',
  home: 'Casa',
  pet: 'Pet',
  simulador: 'Simulador',
  professor: 'Professor'
}

type AgentPromptTestPanelProps = {
  defaultAgent: ConversationalAgentId
  onNewConversation: () => void
}

export function AgentPromptTestPanel({
  defaultAgent,
  onNewConversation
}: AgentPromptTestPanelProps) {
  const [open, setOpen] = useState(false)
  const [agent, setAgent] = useState<ConversationalAgentId>(defaultAgent)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadPrompt = useCallback(async (targetAgent: ConversationalAgentId) => {
    setLoadingPrompt(true)
    setMessage('')
    try {
      const response = await fetch(
        `/api/conversational-chat/dev/prompt?agent=${targetAgent}`,
        { cache: 'no-store' }
      )
      if (!response.ok) throw new Error()
      const data = (await response.json()) as PromptResponse
      setPrompt(data.prompt)
    } catch {
      setMessage('Não consegui carregar o prompt atual.')
    } finally {
      setLoadingPrompt(false)
    }
  }, [])

  useEffect(() => {
    if (open) void loadPrompt(agent)
  }, [open, agent, loadPrompt])

  async function savePrompt() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/conversational-chat/dev/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, prompt })
      })
      if (!response.ok) throw new Error()
      setMessage('Prompt salvo. O n8n já consulta esse prompt na próxima mensagem.')
    } catch {
      setMessage('Falha ao salvar o prompt.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          glassPanelClass,
          'fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-zinc-700 shadow-lg dark:text-zinc-200'
        )}
      >
        <Wrench className="size-3.5" />
        Painel de teste
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none sm:pointer-events-auto sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-6 sm:backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <div
        className={cn(
          glassPanelClass,
          'pointer-events-auto fixed inset-x-3 bottom-3 flex max-h-[70vh] w-auto max-w-2xl flex-col gap-3 overflow-y-auto rounded-2xl p-4',
          'sm:static sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:gap-4 sm:rounded-3xl sm:p-6',
          'lg:max-w-3xl xl:max-w-4xl'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 sm:text-base">
            <Wrench className="size-4 sm:size-5" />
            Painel de teste (HML)
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 sm:text-sm"
          >
            Fechar
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={agent}
            onChange={(event) =>
              setAgent(event.target.value as ConversationalAgentId)
            }
            disabled={loadingPrompt}
            className="rounded-lg border border-zinc-300 bg-white/70 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 sm:text-sm"
          >
            {CONVERSATIONAL_AGENT_IDS.map((id) => (
              <option key={id} value={id}>
                {AGENT_LABELS[id]}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNewConversation}
            className="sm:h-10 sm:px-4 sm:text-sm"
          >
            Nova conversa
          </Button>

          {!loadingPrompt && !prompt ? (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-200 sm:px-3 sm:py-1.5 sm:text-xs">
              sem prompt salvo — agente vai responder sem instruções
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Prompt do agente ({AGENT_LABELS[agent]})
            </label>
            <button
              type="button"
              onClick={() => void loadPrompt(agent)}
              disabled={loadingPrompt}
              className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Recarregar prompt"
            >
              <RefreshCcw className={cn('size-3.5 sm:size-4', loadingPrompt && 'animate-spin')} />
            </button>
          </div>

          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={loadingPrompt}
            rows={10}
            placeholder="Escreva aqui o prompt deste agente — é o que o n8n vai usar na próxima mensagem."
            className="min-h-[220px] flex-1 bg-white/70 text-xs dark:bg-zinc-900/60 sm:min-h-[440px] sm:text-sm sm:leading-relaxed"
          />

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              onClick={savePrompt}
              disabled={saving || loadingPrompt || prompt.trim().length < 20}
              className="sm:h-10 sm:px-4 sm:text-sm"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar prompt
            </Button>
          </div>

          {message ? <p className="text-xs text-zinc-600 dark:text-zinc-300 sm:text-sm">{message}</p> : null}
        </div>
      </div>
    </div>
  )
}

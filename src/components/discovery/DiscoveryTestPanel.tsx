'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCcw, RotateCcw, Save, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

type PromptResponse = {
  prompt: string
  defaultPrompt: string
  isOverridden: boolean
}

type DiscoveryTestPanelProps = {
  onRestart: () => void
}

export function DiscoveryTestPanel({ onRestart }: DiscoveryTestPanelProps) {
  const [open, setOpen] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [isOverridden, setIsOverridden] = useState(false)
  const [saving, setSaving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [message, setMessage] = useState('')

  const loadPrompt = useCallback(async () => {
    setLoadingPrompt(true)
    setMessage('')
    try {
      const response = await fetch('/api/discovery/dev/prompt', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = (await response.json()) as PromptResponse
      setPrompt(data.prompt)
      setIsOverridden(data.isOverridden)
    } catch {
      setMessage('Não consegui carregar o prompt atual.')
    } finally {
      setLoadingPrompt(false)
    }
  }, [])

  useEffect(() => {
    if (open) void loadPrompt()
  }, [open, loadPrompt])

  async function savePrompt() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/discovery/dev/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      if (!response.ok) throw new Error()
      setIsOverridden(true)
      setMessage('Prompt salvo. Reinicie o discovery para testar com ele.')
    } catch {
      setMessage('Falha ao salvar o prompt.')
    } finally {
      setSaving(false)
    }
  }

  async function restoreDefaultPrompt() {
    setRestoring(true)
    setMessage('')
    try {
      const response = await fetch('/api/discovery/dev/prompt', { method: 'DELETE' })
      if (!response.ok) throw new Error()
      await loadPrompt()
      setMessage('Prompt padrão restaurado.')
    } catch {
      setMessage('Falha ao restaurar o prompt padrão.')
    } finally {
      setRestoring(false)
    }
  }

  async function restartDiscovery() {
    setRestarting(true)
    setMessage('')
    try {
      const response = await fetch('/api/discovery/dev/restart', { method: 'POST' })
      if (!response.ok) throw new Error()
      onRestart()
    } catch {
      setMessage('Falha ao reiniciar o discovery.')
      setRestarting(false)
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
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={restartDiscovery}
            disabled={restarting}
            className="sm:h-10 sm:px-4 sm:text-sm"
          >
            {restarting ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            Reiniciar discovery
          </Button>

          {isOverridden ? (
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-200 sm:px-3 sm:py-1.5 sm:text-xs">
              prompt customizado ativo
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:px-3 sm:py-1.5 sm:text-xs">
              prompt padrão
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 sm:text-sm">
              Prompt do agente de descoberta
            </label>
            <button
              type="button"
              onClick={() => void loadPrompt()}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={restoreDefaultPrompt}
              disabled={restoring || loadingPrompt}
              className="sm:h-10 sm:px-4 sm:text-sm"
            >
              Restaurar padrão
            </Button>
          </div>

          {message ? <p className="text-xs text-zinc-600 dark:text-zinc-300 sm:text-sm">{message}</p> : null}
        </div>
      </div>
    </div>
  )
}

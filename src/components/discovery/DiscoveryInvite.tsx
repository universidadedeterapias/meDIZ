'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'

import { apiFetch } from '@/lib/fetchClient'
import { cn } from '@/lib/utils'

/**
 * Convite para a Conversa de Descoberta, no lugar do redirecionamento que existia.
 *
 * Vem com o motivo dito e com uma saida visivel. Antes, a unica forma de sair da
 * descoberta era recusar o consentimento — o que tirava a pessoa do fluxo para
 * sempre — e quem aceitava mas nao conseguia concluir ficava preso no gate.
 *
 * Aparece so no chat: quem comprou um livro nao deve ser convidado a nada
 * enquanto le.
 */
export function DiscoveryInvite({
  onDismissed,
  className
}: {
  onDismissed: () => void
  className?: string
}) {
  const router = useRouter()
  const [dismissing, setDismissing] = useState(false)

  const adiar = async () => {
    if (dismissing) return
    setDismissing(true)
    // Some da tela na hora: se a gravacao falhar, o convite volta no proximo
    // carregamento — melhor que segurar a pessoa esperando um POST.
    onDismissed()
    try {
      await apiFetch('/api/discovery/dismiss', { method: 'POST' })
    } catch {
      // Silencioso de proposito: adiar nunca deve virar erro na cara do usuario.
    }
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-xl border border-violet-200/70 bg-violet-50/70 p-4 dark:border-violet-400/20 dark:bg-violet-950/30',
        className
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm dark:bg-zinc-900 dark:text-violet-300">
        <Sparkles className="size-4" />
      </span>

      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Quer que eu te conheça antes da gente conversar?
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          São alguns minutos de conversa por voz. Depois disso minhas respostas
          passam a considerar o seu contexto, em vez de começar do zero toda vez.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/descoberta')}
            className="h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
          >
            Vamos lá
          </button>
          <button
            type="button"
            onClick={() => void adiar()}
            disabled={dismissing}
            className="h-9 rounded-full px-4 text-sm font-medium text-zinc-600 transition hover:bg-white/70 disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
          >
            Agora não
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void adiar()}
        disabled={dismissing}
        aria-label="Dispensar convite"
        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/70 hover:text-zinc-700 disabled:opacity-60 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

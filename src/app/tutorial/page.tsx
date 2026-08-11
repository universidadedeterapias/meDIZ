'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2 } from 'lucide-react'

import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

type TutorialStatus = {
  requiresTutorial: boolean
  tutorialSeenAt: string | null
  embedUrl: string
  shareUrl: string
}

export default function TutorialPage() {
  const router = useRouter()
  const [status, setStatus] = useState<TutorialStatus | null>(null)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')
  const finishingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      const response = await fetch('/api/tutorial/status', { cache: 'no-store' })

      if (response.status === 401) {
        router.replace('/login')
        return
      }

      const data = (await response.json()) as TutorialStatus
      if (!cancelled) setStatus(data)
    }

    loadStatus().catch(() => {
      if (!cancelled) setError('Não consegui carregar o tutorial agora.')
    })

    return () => {
      cancelled = true
    }
  }, [router])

  /**
   * Concluir e pular gravam a mesma marca. Só navegamos depois que o registro
   * volta ok: sair antes disso devolveria a pessoa para cá no redirecionamento
   * seguinte do /chat.
   */
  async function finishTutorial(skipped: boolean) {
    if (finishingRef.current) return

    finishingRef.current = true
    setFinishing(true)
    setError('')

    try {
      const response = await fetch('/api/tutorial/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped })
      })

      if (!response.ok) throw new Error('Falha ao registrar tutorial')

      router.replace('/chat')
    } catch {
      finishingRef.current = false
      setFinishing(false)
      setError('Não consegui salvar seu progresso. Tenta de novo?')
    }
  }

  // Quem já viu chegou aqui pela sidebar: não precisa de "pular", e o botão
  // principal é só um caminho de volta.
  const isReview = Boolean(status && !status.requiresTutorial)

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <header
        className={cn(
          glassPanelClass,
          'sticky top-0 z-40 w-full shrink-0 rounded-b-2xl pt-[env(safe-area-inset-top)]',
          'md:top-2 md:mx-2 md:mt-2 md:w-auto md:rounded-2xl'
        )}
      >
        <div className="relative flex h-14 items-center justify-between px-3 sm:px-4">
          <MedizChatV2Logo />

          <button
            type="button"
            onClick={() => void finishTutorial(!isReview)}
            disabled={finishing}
            className="text-sm font-medium text-zinc-500 underline-offset-4 transition hover:underline disabled:opacity-60 dark:text-zinc-400"
          >
            {finishing ? 'Salvando…' : isReview ? 'Fechar' : 'Pular'}
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        <div className="shrink-0 text-center">
          <h1 className="text-xl font-extrabold tracking-tight text-violet-950 dark:text-violet-100 sm:text-2xl">
            {isReview ? 'Tutorial do meDIZ 2.0' : 'Bem-vindo ao meDIZ 2.0'}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">
            Um passeio rápido pelo que mudou e como aproveitar o app.
          </p>
        </div>

        {/*
          Altura fixa em vez de `flex-1`: o demo tem proporção de celular e, em
          janelas baixas, deixar o iframe esticar empurrava o botão principal
          para fora da tela.
        */}
        <div className="relative h-[62vh] min-h-[360px] w-full shrink-0 overflow-hidden rounded-2xl border border-white/60 bg-white shadow-xl shadow-violet-950/10 dark:border-zinc-800/60 dark:shadow-black/30">
          {status ? (
            <iframe
              src={status.embedUrl}
              title="Tutorial do meDIZ 2.0"
              onLoad={() => setFrameLoaded(true)}
              allow="clipboard-write; fullscreen"
              allowFullScreen
              className="size-full border-0"
            />
          ) : null}

          {!status || !frameLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent">
              <Loader2 className="size-6 animate-spin text-violet-600 dark:text-violet-300" />
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="shrink-0 text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="flex shrink-0 flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={() => void finishTutorial(false)}
            disabled={finishing}
            className="h-12 w-full max-w-sm rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl disabled:opacity-60"
          >
            {finishing
              ? 'Salvando…'
              : isReview
                ? 'Voltar para o chat'
                : 'Começar a usar'}
          </button>

          {status ? (
            <a
              href={status.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              <ExternalLink className="size-3.5" />
              Não carregou? Abrir o tutorial em outra aba
            </a>
          ) : null}
        </div>
      </main>
    </div>
  )
}

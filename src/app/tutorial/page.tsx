'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2 } from 'lucide-react'

import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

type TutorialStatus = {
  requiresTutorial: boolean
  tutorialSeenAt: string | null
  tutorialUrl: string
}

/**
 * Ponte para o tutorial: marca como visto e manda para o demo no Supademo.
 *
 * A marca é gravada ANTES de sair porque o caminho de volta é o botão no fim do
 * demo, que aponta para o meDIZ — sem isso, a volta cairia no gate do /chat e a
 * pessoa entraria em laço. Na prática isso torna o tutorial opcional: quem
 * fechar a aba no meio não é trazido de volta à força, e pode rever pela
 * sidebar quando quiser.
 */
export default function TutorialPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [tutorialUrl, setTutorialUrl] = useState<string | null>(null)
  const startedRef = useRef(false)

  const openTutorial = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setError('')

    try {
      const statusResponse = await fetch('/api/tutorial/status', {
        cache: 'no-store'
      })

      if (statusResponse.status === 401) {
        router.replace('/login')
        return
      }

      const status = (await statusResponse.json()) as TutorialStatus
      setTutorialUrl(status.tutorialUrl)

      const completeResponse = await fetch('/api/tutorial/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipped: false })
      })

      if (!completeResponse.ok) throw new Error('Falha ao registrar tutorial')

      // `replace` para o voltar do navegador não cair nesta ponte de novo.
      window.location.replace(status.tutorialUrl)
    } catch {
      startedRef.current = false
      setError('Não consegui abrir o tutorial agora.')
    }
  }, [router])

  useEffect(() => {
    void openTutorial()
  }, [openTutorial])

  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 px-6 text-center dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f]">
      <MedizChatV2Logo />

      {error ? (
        <>
          <p className="max-w-sm text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => void openTutorial()}
              className="h-11 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => router.replace('/chat')}
              className={cn(
                glassPanelClass,
                'h-11 rounded-full px-6 text-sm font-medium text-zinc-700 transition hover:bg-white/70 dark:text-zinc-200'
              )}
            >
              Ir para o chat
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
            <Loader2 className="size-4 animate-spin text-violet-600 dark:text-violet-300" />
            Abrindo o tutorial…
          </div>

          {tutorialUrl ? (
            <a
              href={tutorialUrl}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              <ExternalLink className="size-3.5" />
              Se não abrir sozinho, clique aqui
            </a>
          ) : null}
        </>
      )}
    </div>
  )
}

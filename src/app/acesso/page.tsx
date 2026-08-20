'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { glassPanelClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

/** Onde a pessoa cai depois de entrar: o que ela comprou, nao o chat. */
const DEFAULT_DESTINATION = '/biblioteca'

type State = 'entrando' | 'erro'

/**
 * Entrada pelo link de acesso.
 *
 * O token e consumido no submit disparado por JavaScript, e nunca na renderizacao
 * do GET. Isso e o que impede o preview de link do WhatsApp/ChatVolt de queimar o
 * token antes de a pessoa clicar: o crawler busca o HTML, mas nao executa o
 * script. Para quem abre de verdade, o efeito e o mesmo de nao ter clique nenhum.
 */
function AcessoInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<State>('entrando')
  const startedRef = useRef(false)

  const token = searchParams.get('token') ?? ''
  const next = searchParams.get('next')
  const destination =
    next && next.startsWith('/') ? next : DEFAULT_DESTINATION

  const entrar = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    setState('entrando')

    // Sem token nao ha o que consumir, e isso nao e erro: e o aviso de quem ja
    // tem conta e entra com a propria senha. O botao do template do WhatsApp cai
    // aqui porque a URL base cadastrada na Meta e fixa em /acesso — quem manda
    // essa pessoa para o login e esta pagina, e nao a tela de "link expirado".
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(destination)}`)
      return
    }

    try {
      const res = await signIn('magic-link', { token, redirect: false })

      if (!res || res.error) {
        startedRef.current = false
        setState('erro')
        return
      }

      // Navegacao dura de proposito. O cookie de sessao nasce nesta resposta, e
      // `router.replace` faz navegacao suave: o destino era renderizado a partir
      // do cache do router, ainda sem sessao, e a pessoa ficava no "Entrando..."
      // para sempre. Recarregar a URL inteira garante que o servidor veja o
      // cookie — este e o unico ponto do app que loga e navega no mesmo gesto.
      window.location.replace(destination)
    } catch {
      // Sem este catch, qualquer rejeicao do signIn deixava o spinner girando e
      // o botao "Tentar de novo" inerte, porque `startedRef` nunca era liberado.
      startedRef.current = false
      setState('erro')
    }
  }, [destination, router, token])

  useEffect(() => {
    void entrar()
  }, [entrar])

  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 px-6 text-center dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f]">
      <MedizChatV2Logo />

      {state === 'entrando' ? (
        <>
          <div className="flex items-center gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
            <Loader2 className="size-4 animate-spin text-violet-600 dark:text-violet-300" />
            Entrando…
          </div>
          <noscript>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-300">
              Ative o JavaScript para entrar por este link, ou acesse pelo login.
            </p>
          </noscript>
        </>
      ) : (
        <>
          <div className="max-w-sm space-y-2">
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              Este link não vale mais
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Links de acesso valem por 7 dias e só podem ser usados uma vez. Peça
              um novo no atendimento, ou entre com seu e-mail e senha.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => void entrar()}
              className="h-11 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 px-6 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className={cn(
                glassPanelClass,
                'h-11 rounded-full px-6 text-sm font-medium text-zinc-700 transition hover:bg-white/70 dark:text-zinc-200'
              )}
            >
              Entrar com e-mail e senha
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AcessoPage() {
  return (
    <Suspense fallback={null}>
      <AcessoInner />
    </Suspense>
  )
}

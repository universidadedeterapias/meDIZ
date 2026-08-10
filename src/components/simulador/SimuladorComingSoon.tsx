'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock3, Leaf, Sparkles, UserRound } from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import { ChatAppHeader } from '@/components/chat/ChatAppHeader'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  SIMULATOR_MODES,
  type SimulatorMode
} from '@/lib/conversational-chat/simulator-modes'

/**
 * Tela de espera do simulador. Enquanto a funcionalidade estiver em teste
 * (`SIMULATOR_ENABLED === false`), é ela que aparece no lugar do chat — tanto
 * em "simular terapia" quanto em "simular atendimento".
 */
export function SimuladorComingSoon({ mode }: { mode: SimulatorMode }) {
  const router = useRouter()
  const config = SIMULATOR_MODES[mode]
  const BadgeIcon = config.badgeIcon === 'leaf' ? Leaf : UserRound

  return (
    <SidebarProvider className="relative isolate h-svh overflow-hidden bg-gradient-to-br from-violet-50 via-slate-50 to-violet-100/70 before:pointer-events-none before:fixed before:-left-28 before:-top-24 before:z-0 before:size-96 before:rounded-full before:bg-violet-300/20 before:blur-3xl after:pointer-events-none after:fixed after:-bottom-32 after:right-0 after:z-0 after:size-80 after:rounded-full after:bg-slate-200/25 after:blur-3xl dark:from-[#0f0e14] dark:via-[#111017] dark:to-[#17131f] dark:before:bg-violet-700/10 dark:after:bg-violet-950/10">
      <AppSidebar
        history={[]}
        selectedThread={null}
        onSelectSession={() => {}}
      />

      <SidebarInset className="h-svh min-w-0 overflow-hidden !bg-transparent">
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent text-foreground">
          <ChatAppHeader onSuggestion={() => router.push('/suggestion')} />

          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6">
            <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <Clock3 className="size-4" />
                Em fase de testes
              </span>

              <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-violet-950 dark:text-violet-100 sm:text-3xl">
                Aguarde: o meDIZ! Simulador ainda está em preparação
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base">
                Estamos ajustando cada detalhe para entregar uma experiência
                segura, útil e alinhada ao Método [RE]Sentir. Assim que
                liberarmos, você poderá usar este modo por aqui mesmo.
              </p>

              <div className="mt-7 w-full rounded-3xl border border-violet-100 bg-white/75 p-5 text-left shadow-lg shadow-violet-950/5 backdrop-blur-xl dark:border-violet-900/50 dark:bg-zinc-900/70 dark:shadow-black/20">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <BadgeIcon className="size-3" />
                  {config.badge}
                </span>
                <h2 className="mt-3 text-lg font-bold text-violet-950 dark:text-violet-100">
                  {config.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {config.description}
                </p>
                {config.disclaimer ? (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">
                    <Leaf className="mt-0.5 size-3.5 shrink-0" />
                    {config.disclaimer}
                  </p>
                ) : null}
              </div>

              <div className="mt-7 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  className="h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-500/25"
                >
                  <Link href="/chat">Voltar para o chat</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-2xl border-violet-200 bg-white/70 px-6 text-sm font-semibold text-violet-800 dark:border-violet-800 dark:bg-zinc-900/70 dark:text-violet-200"
                >
                  <Link href="/simulador">Conhecer os modos</Link>
                </Button>
              </div>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                Avisaremos assim que a simulação estiver disponível.
              </p>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

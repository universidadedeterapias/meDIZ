'use client'

import { Clock3, Leaf, Sparkles, UserRound } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { Button } from '@/components/ui/button'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import {
  SIMULATOR_MODES,
  type SimulatorMode,
  type SimulatorModeConfig
} from '@/lib/conversational-chat/simulator-modes'
import { cn } from '@/lib/utils'

function ModeIllustration({ mode }: { mode: SimulatorMode }) {
  if (mode === 'terapeuta') {
    return (
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center sm:h-32 sm:w-32">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-200/80 to-indigo-100/60 dark:from-violet-900/40 dark:to-indigo-950/30" />
        <div className="relative flex flex-col items-center gap-1">
          <div className="flex h-10 w-14 items-end justify-center rounded-t-2xl bg-violet-500/90 shadow-sm">
            <div className="mb-1 h-5 w-8 rounded-full bg-violet-300/80" />
          </div>
          <div className="h-6 w-10 rounded-md bg-white/90 shadow-sm dark:bg-violet-950/80" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:h-32 sm:w-32">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-100 via-sky-100 to-violet-100 dark:from-emerald-950/50 dark:via-sky-950/30 dark:to-violet-950/40" />
      <div className="relative h-16 w-12 rounded-full bg-gradient-to-b from-rose-200 to-rose-100 shadow-inner dark:from-rose-900/60 dark:to-rose-950/40" />
      <div className="absolute bottom-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
    </div>
  )
}

function ModeCard({ config }: { config: SimulatorModeConfig }) {
  const BadgeIcon = config.badgeIcon === 'leaf' ? Leaf : UserRound

  return (
    <article
      className={cn(
        'relative h-full overflow-hidden rounded-3xl border bg-white shadow-[0_14px_45px_rgba(91,33,182,0.10)] dark:bg-card',
        config.id === 'terapeuta'
          ? 'border-blue-100 dark:border-blue-900/50'
          : 'border-emerald-100 dark:border-emerald-900/50'
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          config.id === 'terapeuta' ? 'bg-blue-500' : 'bg-emerald-500'
        )}
      />

      <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <ModeIllustration mode={config.id} />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                config.id === 'terapeuta'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              )}
            >
              <BadgeIcon className="h-3 w-3" />
              {config.badge}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Clock3 className="h-3 w-3" />
              Em breve
            </span>
          </div>

          <div className="mt-4 flex-1">
            <h2 className="text-lg font-bold text-[#4c1d95] dark:text-violet-100">
              {config.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {config.description}
            </p>
            {config.disclaimer ? (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">
                <Leaf className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {config.disclaimer}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            disabled
            className={cn(
              'mt-5 h-11 w-full cursor-not-allowed rounded-xl text-sm font-bold tracking-wide disabled:opacity-100',
              config.id === 'terapeuta'
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
            )}
          >
            <Clock3 className="mr-2 h-4 w-4" />
            DISPONÍVEL EM BREVE
          </Button>
        </div>
      </div>
    </article>
  )
}

export function SimuladorModePicker() {
  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset className="min-h-svh bg-gradient-to-b from-[#f3ecfa] to-white dark:from-[#0f0a18] dark:to-background">
        <header className="flex items-center gap-2 border-b border-violet-100/80 px-3 py-3 dark:border-violet-900/40">
          <SidebarTrigger className="text-violet-700 dark:text-violet-300" />
        </header>

        <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
          <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-700/10" />

          <div className="mb-9 flex flex-col items-center text-center">
            <MedizChatV2Logo />
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
              Novidade em desenvolvimento
            </span>
            <h1 className="mt-5 max-w-3xl text-2xl font-extrabold tracking-tight text-[#4c1d95] dark:text-violet-100 sm:text-4xl sm:leading-tight">
              Uma nova forma de treinar e vivenciar atendimentos está chegando
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Conheça antecipadamente o meDIZ! Simulador. Em breve, você poderá
              praticar a condução de atendimentos ou viver uma experiência
              guiada pelo Método [RE]Sentir.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            <ModeCard config={SIMULATOR_MODES.terapeuta} />
            <ModeCard config={SIMULATOR_MODES.experiencia} />
          </div>

          <div className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-violet-200/70 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur dark:border-violet-800/60 dark:bg-violet-950/20">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Estamos preparando cada detalhe para entregar uma experiência
              segura, útil e alinhada ao Método [RE]Sentir.
            </p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Leaf, RefreshCw, UserRound } from 'lucide-react'
import { AppSidebar } from '@/components/app-sidebar'
import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { UpgradeModal } from '@/components/UpgradeModal'
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
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

function ModeCard({
  config,
  onSelect,
  disabled
}: {
  config: SimulatorModeConfig
  onSelect: () => void
  disabled?: boolean
}) {
  const BadgeIcon = config.badgeIcon === 'leaf' ? Leaf : UserRound

  return (
    <article className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_30px_rgba(91,33,182,0.08)] dark:border-violet-900/50 dark:bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <ModeIllustration mode={config.id} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex justify-end">
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
          </div>
          <div>
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
            disabled={disabled}
            className={cn(
              'h-11 w-full rounded-xl text-sm font-bold tracking-wide',
              config.buttonClassName
            )}
            onClick={onSelect}
          >
            {config.buttonLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}

export function SimuladorModePicker() {
  const router = useRouter()
  const { isPremium, isLoading: isLoadingPremium } = useSubscriptionStatus()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const handleSelect = (mode: SimulatorMode) => {
    if (!isPremium && !isLoadingPremium) {
      setShowUpgrade(true)
      return
    }
    router.push(`/simulador/chat?mode=${mode}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar history={[]} selectedThread={null} onSelectSession={() => {}} />
      <SidebarInset className="min-h-svh bg-gradient-to-b from-[#f3ecfa] to-white dark:from-[#0f0a18] dark:to-background">
        <header className="flex items-center gap-2 border-b border-violet-100/80 px-3 py-3 dark:border-violet-900/40">
          <SidebarTrigger className="text-violet-700 dark:text-violet-300" />
        </header>

        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <MedizChatV2Logo />
            <h1 className="mt-5 text-xl font-extrabold tracking-tight text-[#4c1d95] dark:text-violet-100 sm:text-2xl">
              SIMULAR ATENDIMENTO
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha como você quer explorar essa experiência.
            </p>
          </div>

          <div className="space-y-4">
            <ModeCard
              config={SIMULATOR_MODES.terapeuta}
              disabled={isLoadingPremium}
              onSelect={() => handleSelect('terapeuta')}
            />
            <ModeCard
              config={SIMULATOR_MODES.experiencia}
              disabled={isLoadingPremium}
              onSelect={() => handleSelect('experiencia')}
            />
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Você pode trocar de modo a qualquer momento.
          </p>
        </main>
      </SidebarInset>

      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
    </SidebarProvider>
  )
}

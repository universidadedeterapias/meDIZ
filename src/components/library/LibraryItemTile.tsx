'use client'

import { Lock, Loader2, ExternalLink, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LibraryTileAccent = 'indigo' | 'violet' | 'emerald' | 'amber'

const accentStyles: Record<
  LibraryTileAccent,
  { icon: string; border: string; bg: string; cta: string; ring: string }
> = {
  indigo: {
    icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
    border: 'border-indigo-200/80 dark:border-indigo-800/60',
    bg: 'bg-gradient-to-br from-white to-indigo-50/80 dark:from-zinc-900 dark:to-indigo-950/40',
    cta: 'text-indigo-700 bg-indigo-50 dark:text-indigo-200 dark:bg-indigo-950/60',
    ring: 'hover:ring-indigo-200 dark:hover:ring-indigo-800'
  },
  violet: {
    icon: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
    border: 'border-violet-200/80 dark:border-violet-800/60',
    bg: 'bg-gradient-to-br from-white to-violet-50/80 dark:from-zinc-900 dark:to-violet-950/40',
    cta: 'text-violet-700 bg-violet-50 dark:text-violet-200 dark:bg-violet-950/60',
    ring: 'hover:ring-violet-200 dark:hover:ring-violet-800'
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    bg: 'bg-gradient-to-br from-white to-emerald-50/80 dark:from-zinc-900 dark:to-emerald-950/40',
    cta: 'text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/60',
    ring: 'hover:ring-emerald-200 dark:hover:ring-emerald-800'
  },
  amber: {
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    bg: 'bg-gradient-to-br from-white to-amber-50/80 dark:from-zinc-900 dark:to-amber-950/40',
    cta: 'text-amber-800 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/60',
    ring: 'hover:ring-amber-200 dark:hover:ring-amber-800'
  }
}

type LibraryItemTileProps = {
  title: string
  subtitle?: string
  icon: LucideIcon
  accent: LibraryTileAccent
  unlocked: boolean
  isLoading?: boolean
  actionLabel: string
  lockedLabel: string
  loadingLabel?: string
  onClick: () => void
  className?: string
}

export function LibraryItemTile({
  title,
  subtitle,
  icon: Icon,
  accent,
  unlocked,
  isLoading = false,
  actionLabel,
  lockedLabel,
  loadingLabel = 'Abrindo...',
  onClick,
  className
}: LibraryItemTileProps) {
  const styles = accentStyles[accent]

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all duration-200',
        'min-h-[11.5rem] aspect-[4/5] max-sm:min-h-[10.5rem]',
        'sm:aspect-square sm:min-h-0 sm:rounded-2xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        unlocked
          ? cn(styles.border, styles.bg, styles.ring, 'shadow-sm hover:shadow-lg hover:-translate-y-0.5')
          : 'border-zinc-200 bg-zinc-100/90 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/90 dark:hover:border-zinc-600',
        className
      )}
    >
      {!unlocked && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-900/5 backdrop-blur-[2px] dark:bg-black/25"
          aria-hidden
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background/90 shadow-sm">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="rounded-full bg-background/95 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            {lockedLabel}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-3 sm:p-5 md:p-6">
        <div
          className={cn(
            'mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-105 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl',
            unlocked ? styles.icon : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
          )}
        >
          <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.5} />
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base md:text-lg">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs md:text-sm">
            {subtitle}
          </p>
        )}

        <div className="mt-auto pt-2 sm:pt-4">
          <span
            className={cn(
              'inline-flex w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-sm',
              unlocked ? styles.cta : 'bg-zinc-200/80 text-zinc-500 dark:bg-zinc-700/80 dark:text-zinc-400'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingLabel}
              </>
            ) : (
              <>
                {unlocked && <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70 sm:h-4 sm:w-4" />}
                <span className="truncate">{unlocked ? actionLabel : lockedLabel}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </button>
  )
}

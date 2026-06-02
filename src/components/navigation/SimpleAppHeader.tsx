'use client'

import { ThemeToggle } from '@/components/ThemeToggle'
import { PageBackButton } from './PageBackButton'

export type SimpleAppHeaderProps = {
  backFallback?: string
  title?: React.ReactNode
  right?: React.ReactNode
}

/** Cabeçalho compacto (conta, histórico de pagamentos…) */
export function SimpleAppHeader({
  backFallback = '/chat',
  title,
  right
}: SimpleAppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-14 min-h-14 max-w-3xl items-center justify-between gap-2 px-3 sm:h-16 sm:min-h-16 sm:gap-3 sm:px-4">
        <PageBackButton fallbackHref={backFallback} />
        {title ?? (
          <p className="truncate text-lg font-bold text-primary sm:text-xl">
            me<span className="uppercase">diz</span>
            <span className="text-yellow-400">!</span>
          </p>
        )}
        {right ?? <ThemeToggle variant="icon" />}
      </div>
    </header>
  )
}

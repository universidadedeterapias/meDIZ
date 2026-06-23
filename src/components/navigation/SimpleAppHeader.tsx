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
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 shadow-sm backdrop-blur-md">
      <div className="relative mx-auto flex h-14 min-h-14 max-w-3xl items-center px-2 sm:h-16 sm:min-h-16 sm:px-4">
        <div className="relative z-10 shrink-0">
          <PageBackButton fallbackHref={backFallback} showLabel={false} />
        </div>
        <div className="pointer-events-none absolute inset-x-12 flex justify-center sm:inset-x-16">
          {title ?? (
            <p className="truncate text-base font-bold text-primary sm:text-xl">
              me<span className="uppercase">diz</span>
              <span className="text-yellow-400">!</span>
            </p>
          )}
        </div>
        <div className="relative z-10 ml-auto shrink-0">
          {right ?? <ThemeToggle variant="icon" />}
        </div>
      </div>
    </header>
  )
}

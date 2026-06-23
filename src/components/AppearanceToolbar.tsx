'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

/** Barra compacta (canto da tela) para login, cadastro, splash */
export function AppearanceToolbar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl bg-background/80 p-1.5 shadow-md ring-1 ring-border backdrop-blur-sm',
        className
      )}
    >
      <ThemeToggle variant="icon" />
      <LanguageSwitcher showLabel={false} className="min-w-[120px] sm:min-w-[140px]" />
    </div>
  )
}

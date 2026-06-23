'use client'

import { LanguageSwitcher } from '@/components/language-switcher'
import { cn } from '@/lib/utils'

type AppearanceSettingsProps = {
  className?: string
}

/** Preferências de idioma (tema fica só no cabeçalho superior) */
export function AppearanceSettings({ className }: AppearanceSettingsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <LanguageSwitcher showLabel />
    </div>
  )
}

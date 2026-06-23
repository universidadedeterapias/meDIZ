'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

export type ThemeToggleProps = {
  /** icon: botão sol/lua | switch: linha com rótulo (sidebar, conta) */
  variant?: 'icon' | 'switch'
  className?: string
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  const labelLight = t('theme.light', 'Claro')
  const labelDark = t('theme.dark', 'Escuro')
  const labelDarkMode = t('theme.darkMode', 'Modo escuro')

  const setLight = () => setTheme('light')
  const setDark = () => setTheme('dark')

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn('h-9 w-9', className)}
        disabled
        aria-hidden
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === 'switch') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDark ? (
            <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
          ) : (
            <Sun className="h-4 w-4 shrink-0 text-amber-500" />
          )}
          <Label htmlFor="theme-switch" className="text-sm font-medium cursor-pointer">
            {labelDarkMode}
          </Label>
        </div>
        <Switch
          id="theme-switch"
          checked={isDark}
          onCheckedChange={(checked) => (checked ? setDark() : setLight())}
          aria-label={labelDarkMode}
        />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              'relative h-9 w-9 border-border bg-background hover:bg-accent',
              className
            )}
            onClick={() => (isDark ? setLight() : setDark())}
            aria-label={isDark ? labelLight : labelDark}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isDark ? labelLight : labelDark}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { AppearanceToolbar } from '@/components/AppearanceToolbar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

/** Telas públicas: toolbar completa (tema + idioma no canto) */
const TOOLBAR_PATHS = new Set([
  '/signup',
  '/reset',
  '/form',
  '/confirm-signup',
  '/verify-whatsapp',
  '/admin-login',
  '/'
])

/** Login: só tema no canto; idioma fica no formulário */
const THEME_ONLY_PATHS = new Set(['/login'])

export function AuthPageChrome({ className }: { className?: string }) {
  const pathname = usePathname() ?? ''

  if (!TOOLBAR_PATHS.has(pathname) && !THEME_ONLY_PATHS.has(pathname)) {
    return null
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed right-3 top-3 z-[60] sm:right-4 sm:top-4',
        className
      )}
    >
      <div className="pointer-events-auto">
        {THEME_ONLY_PATHS.has(pathname) ? (
          <div className="rounded-xl bg-white/15 p-1 shadow-md ring-1 ring-white/25 backdrop-blur-sm">
            <ThemeToggle
              variant="icon"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            />
          </div>
        ) : (
          <AppearanceToolbar />
        )}
      </div>
    </div>
  )
}

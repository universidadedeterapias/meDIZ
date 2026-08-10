'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  className?: string
}

/**
 * Fundo com gradiente na cor principal da marca + "orbs" de luz desfocados e
 * flutuantes — dá textura real por trás do glassmorphism (sem isso o blur
 * dos cards não fica perceptível). Usado no /login e no splash.
 */
export function BrandAuroraBackground({ children, className }: Props) {
  return (
    <div
      className={cn(
        'relative isolate min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-purple-700 dark:from-indigo-950 dark:via-violet-950 dark:to-purple-950',
        className
      )}
    >
      <div className="pointer-events-none fixed -left-24 -top-20 z-0 size-96 animate-float-a rounded-full bg-fuchsia-400/25 blur-3xl dark:bg-fuchsia-700/15" />
      <div className="pointer-events-none fixed -bottom-28 right-0 z-0 size-80 animate-float-b rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-800/15" />
      <div className="pointer-events-none fixed right-1/4 top-1/3 z-0 size-64 animate-float-c rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-600/10" />
      <div
        className="pointer-events-none fixed bottom-1/4 left-1/4 z-0 size-72 animate-float-b rounded-full bg-purple-400/15 blur-3xl dark:bg-purple-700/10"
        style={{ animationDelay: '-8s' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

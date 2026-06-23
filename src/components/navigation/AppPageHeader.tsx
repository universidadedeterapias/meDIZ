'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PageBackButton } from './PageBackButton'

export type AppPageHeaderProps = {
  title?: React.ReactNode
  children?: React.ReactNode
  showSidebar?: boolean
  showBack?: boolean
  backFallback?: string
  className?: string
}

/** Cabeçalho padrão das páginas com sidebar (chat, biblioteca, dashboard…) */
export function AppPageHeader({
  title,
  children,
  showSidebar = true,
  showBack = true,
  backFallback = '/chat',
  className
}: AppPageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 min-h-14 items-center gap-1 border-b border-border bg-background/95 px-2 shadow-sm backdrop-blur-md sm:h-16 sm:min-h-16 sm:gap-2 sm:px-4 md:px-6',
        className
      )}
    >
      {showSidebar ? (
        <SidebarTrigger className="-ml-0.5 shrink-0 md:-ml-1" />
      ) : null}
      {showBack ? (
        <PageBackButton
          fallbackHref={backFallback}
          showLabel={false}
          className={cn(showSidebar && 'hidden md:inline-flex')}
        />
      ) : null}
      {title ? (
        <div className="min-w-0 flex-1">
          {typeof title === 'string' ? (
            <h1 className="truncate text-sm font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 sm:text-lg md:text-xl">
              {title}
            </h1>
          ) : (
            title
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <ThemeToggle variant="icon" className="h-8 w-8 sm:h-9 sm:w-9" />
        {children}
      </div>
    </header>
  )
}

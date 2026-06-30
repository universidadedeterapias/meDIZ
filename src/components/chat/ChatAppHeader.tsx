'use client'

import { Bell, MessageSquarePlus } from 'lucide-react'

import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MedizChatV2Logo } from '@/components/conversational-chat/MedizChatV2Shell'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useTranslation } from '@/i18n/useTranslation'
import { glassControlClass, glassShellClass } from '@/lib/glassStyles'
import { cn } from '@/lib/utils'

type ChatAppHeaderProps = {
  onSuggestion: () => void
}

export function ChatAppHeader({ onSuggestion }: ChatAppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        glassShellClass,
        'sticky top-0 z-40 w-full overflow-hidden rounded-b-2xl pt-[env(safe-area-inset-top)]',
        'md:top-2 md:mx-2 md:mt-2 md:w-auto md:rounded-2xl'
      )}
    >
      <div className="relative flex h-14 min-w-0 items-center justify-between px-2 sm:px-3">
        <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/15" />

        <SidebarTrigger
          className={cn(
            glassControlClass,
            'relative size-9 shrink-0 rounded-xl md:size-9 [&_svg]:size-[18px]'
          )}
        />

        <div className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2">
          <MedizChatV2Logo />
        </div>

        <div className="relative ml-auto flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onSuggestion}
            className={cn(glassControlClass, 'size-9 rounded-xl')}
            aria-label={t('sidebar.suggestion.button', 'Sugestão')}
          >
            <MessageSquarePlus className="size-[18px]" />
          </Button>

          <div className="hidden sm:block">
            <LanguageSwitcher
              showLabel={false}
              variant="header"
              triggerClassName={cn(
                glassControlClass,
                'h-9 w-[6.75rem] rounded-xl px-2.5 text-violet-800 dark:text-violet-200'
              )}
            />
          </div>

          <ThemeToggle
            variant="icon"
            className={cn(glassControlClass, 'size-9 rounded-xl')}
          />

          <button
            type="button"
            className={cn(
              glassControlClass,
              'relative hidden size-9 items-center justify-center rounded-xl sm:flex'
            )}
            aria-label={t('notifications.title', 'Notificações')}
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-amber-400 ring-2 ring-white/70 dark:ring-zinc-900/70" />
          </button>
        </div>
      </div>
    </header>
  )
}

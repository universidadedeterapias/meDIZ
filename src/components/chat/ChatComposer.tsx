'use client'

import { forwardRef } from 'react'
import { Mic, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

type ChatComposerProps = {
  value: string
  placeholder: string
  loading?: boolean
  className?: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export const ChatComposer = forwardRef<HTMLInputElement, ChatComposerProps>(
  function ChatComposer(
    { value, placeholder, loading = false, className, onChange, onSubmit },
    ref
  ) {
    const { t } = useTranslation()
    const canSubmit = Boolean(value.trim()) && !loading

    return (
      <div
        className={cn(
          'flex w-full items-center gap-1.5 rounded-[1.35rem] bg-gradient-to-r from-white via-white to-violet-50/80 p-1.5 shadow-2xl shadow-violet-950/15 transition-all duration-300 focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:from-zinc-900 dark:via-zinc-900 dark:to-violet-950/70 dark:shadow-black/35',
          className
        )}
      >
        <span
          role="img"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 shadow-inner dark:from-violet-500/20 dark:to-fuchsia-500/15 dark:text-violet-200"
          aria-label={t('chat.home.microphone.unavailable', 'Áudio em breve')}
          title={t('chat.home.microphone.unavailable', 'Áudio em breve')}
        >
          <Mic className="size-5" />
        </span>

        <Input
          ref={ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              if (canSubmit) onSubmit()
            }
          }}
          placeholder={placeholder}
          disabled={loading}
          className="h-11 min-w-0 flex-1 border-0 bg-transparent px-2 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="size-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-violet-500/35 focus-visible:ring-violet-500 disabled:shadow-none"
          aria-label={t('chat.send', 'Enviar')}
        >
          <Send className="size-4" />
        </Button>
      </div>
    )
  }
)

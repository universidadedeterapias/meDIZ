'use client'

import { useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { LANGUAGE_OPTIONS, SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n/config'
import { useLanguage } from '@/i18n/useLanguage'
import { useTranslation } from '@/i18n/useTranslation'
import { FLAG_COMPONENTS } from '@/components/flags'
import { cn } from '@/lib/utils'

const SHORT_LANGUAGE_LABEL: Record<LanguageCode, string> = {
  'pt-BR': 'BR',
  'pt-PT': 'PT',
  en: 'EN',
  es: 'ES'
}

type LanguageSwitcherProps = {
  showLabel?: boolean
  className?: string
  /** Versão menor (ex.: login) */
  compact?: boolean
  /** Cabeçalho do chat: bandeira no mobile, texto curto a partir de sm */
  variant?: 'default' | 'compact' | 'header'
}

export function LanguageSwitcher({
  showLabel = true,
  className,
  compact = false,
  variant
}: LanguageSwitcherProps) {
  const resolvedVariant = variant ?? (compact ? 'compact' : 'default')
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: string) => {
    if (!SUPPORTED_LANGUAGES.includes(value as LanguageCode)) {
      console.warn('[LanguageSwitcher] Idioma não suportado:', value)
      return
    }

    console.log('[LanguageSwitcher] Mudando idioma de', language, 'para', value)
    
    startTransition(() => {
      setLanguage(value as LanguageCode)
      console.log('[LanguageSwitcher] Idioma atualizado para:', value)
    })
  }

  const CurrentFlag = FLAG_COMPONENTS[language]

  return (
    <div
      className={cn(
        resolvedVariant === 'header' ? 'space-y-0' : 'space-y-1',
        className
      )}
    >
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('language.selector.label', 'Idioma')}
        </span>
      )}
      <Select
        value={language}
        onValueChange={handleChange}
        disabled={isPending}
      >
        <SelectTrigger
          aria-label={t('language.selector.label', 'Idioma')}
          className={cn(
            'border-0 bg-gradient-to-r from-indigo-500 to-purple-600 font-medium text-white transition-all duration-200 hover:from-indigo-600 hover:to-purple-700',
            resolvedVariant === 'header' &&
              'h-9 w-9 shrink-0 justify-center p-0 shadow-md [&>svg]:hidden sm:h-8 sm:w-[7.25rem] sm:justify-between sm:px-2.5 sm:[&>svg]:block',
            resolvedVariant === 'compact' &&
              'h-8 w-[8.5rem] px-2.5 text-xs shadow-md',
            resolvedVariant === 'default' &&
              'h-11 w-full min-w-[140px] text-sm shadow-lg sm:h-12 sm:min-w-[160px] sm:text-base'
          )}
        >
          <div
            className={cn(
              'flex flex-1 items-center',
              resolvedVariant === 'header' ? 'justify-center gap-0 sm:gap-1.5' : 'gap-1.5'
            )}
          >
            {CurrentFlag && (
              <CurrentFlag
                className={cn(
                  'shrink-0',
                  resolvedVariant === 'header' && 'h-4 w-4 sm:h-3.5 sm:w-3.5',
                  resolvedVariant === 'compact' && 'h-3.5 w-3.5',
                  resolvedVariant === 'default' && 'h-5 w-5 sm:h-6 sm:w-6'
                )}
              />
            )}
            <SelectValue placeholder={LANGUAGE_OPTIONS[language].label}>
              {resolvedVariant === 'header' ? (
                <>
                  <span className="sr-only">{LANGUAGE_OPTIONS[language].label}</span>
                  <span className="hidden text-xs sm:inline">
                    {SHORT_LANGUAGE_LABEL[language]}
                  </span>
                </>
              ) : (
                LANGUAGE_OPTIONS[language].label
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground">
          {SUPPORTED_LANGUAGES.map(code => {
            const FlagComponent = FLAG_COMPONENTS[code]
            return (
              <SelectItem 
                key={code} 
                value={code} 
                className="text-sm sm:text-base cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {FlagComponent && (
                    <FlagComponent className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{LANGUAGE_OPTIONS[code].label}</span>
                </div>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}


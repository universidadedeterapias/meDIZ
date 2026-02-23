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

type LanguageSwitcherProps = {
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({ showLabel = true, className }: LanguageSwitcherProps) {
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
    <div className={`space-y-1 ${className ?? ''}`}>
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
        <SelectTrigger className="h-11 sm:h-12 w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm sm:text-base font-medium shadow-lg border-0 hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 min-w-[140px] sm:min-w-[160px]">
          <div className="flex items-center gap-2 flex-1">
            {CurrentFlag && (
              <CurrentFlag className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
            )}
            <SelectValue placeholder={LANGUAGE_OPTIONS[language].label}>
              {LANGUAGE_OPTIONS[language].label}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white">
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


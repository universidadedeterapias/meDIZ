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
        <SelectTrigger className="h-9 w-full bg-background/80 backdrop-blur">
          <SelectValue placeholder={LANGUAGE_OPTIONS[language].label} />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map(code => (
            <SelectItem key={code} value={code}>
              {LANGUAGE_OPTIONS[code].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}


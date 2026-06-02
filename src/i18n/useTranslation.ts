'use client'

import { useMemo } from 'react'
import { getMessages } from './LanguageProvider'
import type { LanguageCode } from './config'
import { useLanguage } from './useLanguage'

export function useTranslation() {
  const { language } = useLanguage()

  const dictionary = useMemo(() => getMessages(language), [language])

  function t(key: string, fallback?: string) {
    return dictionary[key] ?? fallback ?? key
  }

  return {
    t,
    language: language as LanguageCode
  }
}


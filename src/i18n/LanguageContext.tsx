'use client'

import { createContext } from 'react'
import type { LanguageCode } from './config'

export type LanguageContextType = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'pt-BR',
  setLanguage: () => {}
})


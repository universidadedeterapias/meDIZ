import type { LanguageCode } from '../config'
import ptBR from './pt-BR'
import ptPT from './pt-PT'
import en from './en'
import es from './es'

export const messages: Record<LanguageCode, Record<string, string>> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  en,
  es
}


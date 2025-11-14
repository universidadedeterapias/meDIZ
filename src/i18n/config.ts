import type { LanguageOption } from './types'

export const LANGUAGE_COOKIE = 'mediz-language'

export const SUPPORTED_LANGUAGES = ['pt-BR', 'pt-PT', 'en', 'es'] as const

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_OPTIONS: Record<LanguageCode, LanguageOption> = {
  'pt-BR': {
    code: 'pt-BR',
    label: 'Português - BR'
  },
  'pt-PT': {
    code: 'pt-PT',
    label: 'Português - PT'
  },
  en: {
    code: 'en',
    label: 'English'
  },
  es: {
    code: 'es',
    label: 'Español'
  }
}

export const DEFAULT_LANGUAGE: LanguageCode = 'pt-BR'

export function isSupportedLanguage(value: string | undefined | null): value is LanguageCode {
  return !!value && SUPPORTED_LANGUAGES.includes(value as LanguageCode)
}

/**
 * Mapeamento completo de idiomas para diferentes formatos
 * Usado para enviar ao webhook em múltiplos formatos para garantir compatibilidade
 */
export interface LanguageMapping {
  code: LanguageCode
  iso6391: string // Código ISO 639-1 (2 letras)
  iso6392: string // Código ISO 639-2 (3 letras)
  nameNative: string // Nome no idioma nativo
  nameEnglish: string // Nome em inglês
  namePortuguese: string // Nome em português
  instruction: string // Instrução clara para o agente
}

export const LANGUAGE_MAPPING: Record<LanguageCode, LanguageMapping> = {
  'pt-BR': {
    code: 'pt-BR',
    iso6391: 'pt',
    iso6392: 'por',
    nameNative: 'Português do Brasil',
    nameEnglish: 'Brazilian Portuguese',
    namePortuguese: 'Português do Brasil',
    instruction: 'Responda em Português do Brasil (pt-BR)'
  },
  'pt-PT': {
    code: 'pt-PT',
    iso6391: 'pt',
    iso6392: 'por',
    nameNative: 'Português de Portugal',
    nameEnglish: 'European Portuguese',
    namePortuguese: 'Português de Portugal',
    instruction: 'Responda em Português de Portugal (pt-PT)'
  },
  en: {
    code: 'en',
    iso6391: 'en',
    iso6392: 'eng',
    nameNative: 'English',
    nameEnglish: 'English',
    namePortuguese: 'Inglês',
    instruction: 'Respond in English (en)'
  },
  es: {
    code: 'es',
    iso6391: 'es',
    iso6392: 'spa',
    nameNative: 'Español',
    nameEnglish: 'Spanish',
    namePortuguese: 'Espanhol',
    instruction: 'Responde en Español (es)'
  }
}

/**
 * Retorna o mapeamento completo de um idioma
 */
export function getLanguageMapping(code: LanguageCode): LanguageMapping {
  return LANGUAGE_MAPPING[code] || LANGUAGE_MAPPING[DEFAULT_LANGUAGE]
}


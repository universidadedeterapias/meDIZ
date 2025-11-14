'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { LANGUAGE_COOKIE, LANGUAGE_OPTIONS, DEFAULT_LANGUAGE, isSupportedLanguage, type LanguageCode } from './config'
import { LanguageContext } from './LanguageContext'
import { messages } from './messages'

type LanguageProviderProps = {
  initialLanguage: LanguageCode
  children: React.ReactNode
}

// Função auxiliar para ler o cookie no cliente
function getCookieLanguage(): LanguageCode {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE
  
  const cookies = document.cookie.split(';')
  const languageCookie = cookies.find(cookie => cookie.trim().startsWith(`${LANGUAGE_COOKIE}=`))
  
  if (languageCookie) {
    const value = languageCookie.split('=')[1]?.trim()
    if (isSupportedLanguage(value)) {
      return value as LanguageCode
    }
  }
  
  return DEFAULT_LANGUAGE
}

export function LanguageProvider({ initialLanguage, children }: LanguageProviderProps) {
  // Inicializa com o cookie se disponível, senão usa o initialLanguage do servidor
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof document !== 'undefined') {
      const cookieLang = getCookieLanguage()
      // Sempre prioriza o cookie se existir, mesmo que seja o DEFAULT_LANGUAGE
      return cookieLang
    }
    return initialLanguage
  })

  // Atualiza o atributo lang do HTML
  useEffect(() => {
    const html = document.documentElement
    if (html.lang !== language) {
      html.lang = language
    }
  }, [language])

  const setLanguage = useCallback((value: LanguageCode) => {
    console.log('[LanguageProvider] setLanguage chamado com:', value)
    setLanguageState(value)
    if (typeof document !== 'undefined') {
      const maxAge = 60 * 60 * 24 * 365
      // Define o cookie com SameSite=Lax para garantir que funcione corretamente
      document.cookie = `${LANGUAGE_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
      
      // Força atualização do atributo lang imediatamente
      document.documentElement.lang = value
      
      // Verifica se o cookie foi salvo corretamente
      const savedCookie = getCookieLanguage()
      console.log('[LanguageProvider] Cookie salvo:', savedCookie, 'Esperado:', value)
    }
  }, []) // Não precisa de dependências, a função é estável

  const value = useMemo(
    () => ({
      language,
      setLanguage
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function getLanguageName(code: LanguageCode) {
  return LANGUAGE_OPTIONS[code]?.label ?? code
}

export function getMessages(language: LanguageCode) {
  return messages[language] ?? messages['pt-BR']
}


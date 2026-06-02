'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

interface SessionProviderProps {
  children: React.ReactNode
}

export default function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    // Verificar se o endpoint de auth está acessível
    const checkAuthEndpoint = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (!response.ok && response.status !== 401) {
          // 401 é normal quando não está logado, mas outros erros indicam problema
          console.warn('[SessionProvider] Endpoint /api/auth/session retornou:', response.status)
        }
      } catch (error) {
        console.error('[SessionProvider] Erro ao verificar endpoint de auth:', error)
        console.error('[SessionProvider] Verifique se o servidor está rodando e se NEXTAUTH_URL está configurado corretamente')
      }
    }

    // Verificar apenas uma vez ao montar
    checkAuthEndpoint()
  }, [])

  return (
    <NextAuthSessionProvider
      // Adicionar basePath se necessário
      basePath="/api/auth"
      // Adicionar refetchInterval para manter sessão atualizada
      refetchInterval={5 * 60} // 5 minutos
      refetchOnWindowFocus={true}
    >
      {children}
    </NextAuthSessionProvider>
  )
}

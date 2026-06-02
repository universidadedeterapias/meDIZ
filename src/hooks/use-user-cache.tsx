'use client'

/// <reference lib="dom" />

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

export interface SidebarUser {
  id: string
  name: string | null
  email: string
  image: string | null
  fullName: string | null
}

// Cache global simples para evitar múltiplas requisições
export const globalCache: {
  data: SidebarUser | null
  timestamp: number
  promise: Promise<SidebarUser> | null
} = {
  data: null,
  timestamp: 0,
  promise: null
}

/**
 * Limpa o cache global (exportado para uso em logout)
 */
export function clearGlobalCache(): void {
  globalCache.data = null
  globalCache.timestamp = 0
  globalCache.promise = null
}

const CACHE_DURATION = 60000 // 1 minuto

/**
 * Hook otimizado para carregar dados do usuário com cache simples
 * Implementação nativa sem dependências externas
 */
export function useUserCache() {
  // CRÍTICO: Inicializa estado diretamente do cache usando lazy initialization
  // Isso garante que o estado já esteja correto na primeira renderização
  const [user, setUser] = useState<SidebarUser | null>(() => {
    const now = Date.now()
    const cacheAge = now - globalCache.timestamp
    const cacheValid = globalCache.data && cacheAge < CACHE_DURATION
    
    if (cacheValid) {
      return globalCache.data
    }
    return null
  })
  
  // CRÍTICO: isLoading inicia como false se cache tem dados, true caso contrário
  const [isLoading, setIsLoading] = useState(() => {
    const now = Date.now()
    const cacheAge = now - globalCache.timestamp
    const cacheValid = globalCache.data && cacheAge < CACHE_DURATION
    return !cacheValid // Se não tem cache válido, começa carregando
  })
  
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)
  const { status: sessionStatus } = useSession()

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Escuta evento de limpeza de cache (disparado no logout)
  useEffect(() => {
    const handleClearCache = () => {
      clearGlobalCache()
      setUser(null)
      setIsLoading(false)
      setError(null)
    }

    window.addEventListener('clear-user-cache', handleClearCache)
    return () => {
      window.removeEventListener('clear-user-cache', handleClearCache)
    }
  }, [])

  // CRÍTICO: Sincroniza estado com cache quando cache é atualizado (ex: após fetch em outro render)
  // Este useEffect garante que mudanças no cache sejam refletidas no estado
  useEffect(() => {
    const now = Date.now()
    const cacheAge = now - globalCache.timestamp
    const cacheValid = globalCache.data && cacheAge < CACHE_DURATION
    
    // Se cache tem dados válidos mas estado está null → restaura
    if (cacheValid && !user) {
      setUser(globalCache.data)
      setIsLoading(false)
      return
    }
    
    // Se cache tem dados diferentes (atualização) → atualiza
    if (cacheValid && user && user.id !== globalCache.data.id) {
      setUser(globalCache.data)
      setIsLoading(false)
      return
    }
    
    // Se cache válido e user sincronizado mas ainda está loading → corrige
    if (cacheValid && user && user.id === globalCache.data.id && isLoading) {
      setIsLoading(false)
      return
    }
  }, [user, isLoading]) // Não inclui sessionStatus para evitar loops

  // CRÍTICO: Polling de segurança quando estado está inconsistente (loading=true mas cache tem dados)
  // Back-up caso o useEffect de sincronização não detecte a mudança
  useEffect(() => {
    const shouldPoll = isLoading && !user && sessionStatus === 'authenticated'
    
    if (shouldPoll) {
      const interval = setInterval(() => {
        const now = Date.now()
        const cacheAge = now - globalCache.timestamp
        const cacheValid = globalCache.data && cacheAge < CACHE_DURATION
        
        if (cacheValid && !user) {
          setUser(globalCache.data)
          setIsLoading(false)
          clearInterval(interval)
        } else if (!cacheValid && !globalCache.promise) {
          // Sem cache nem promise, pode parar (fetch normal vai iniciar)
          clearInterval(interval)
        }
      }, 100) // Verifica a cada 100ms
      
      // Timeout de segurança: para polling após 3 segundos
      const timeout = setTimeout(() => {
        clearInterval(interval)
      }, 3000)
      
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [isLoading, user, sessionStatus])

  useEffect(() => {
    const fetchUser = async () => {
      // Aguarda autenticação antes de buscar dados
      // MAS: Se cache já tem dados válidos, não precisa aguardar
      if (sessionStatus === 'loading') {
        // CRÍTICO: Se cache tem dados, usa eles imediatamente mesmo durante loading
        const now = Date.now()
        if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
          setUser(globalCache.data)
          setIsLoading(false)
          return
        }
        // Se user já está null e isLoading já está true, não precisa fazer nada
        // Mas se isLoading ainda não foi setado, mantém loading
        if (!user && !isLoading) {
          setIsLoading(true)
        }
        return // Aguarda a sessão carregar
      }

      // Se não autenticado, não busca dados e limpa cache
      if (sessionStatus === 'unauthenticated') {
        clearGlobalCache()
        
        // Limpar localStorage também
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('subscription-status')
            localStorage.removeItem('subscription-status-timestamp')
          } catch {
            // Ignora erros de localStorage
          }
        }
        
        if (mountedRef.current) {
          setUser(null)
          setIsLoading(false)
          setError(null)
        }
        return
      }

      // Só busca se estiver autenticado
      if (sessionStatus !== 'authenticated') {
        return
      }

      const now = Date.now()
      
      // Verifica se temos dados válidos no cache
      if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
        // CRÍTICO: Sempre atualiza estado se cache tem dados válidos
        // Não importa se mountedRef.current - dados já estão disponíveis
        setUser(globalCache.data)
        setIsLoading(false)
        return
      }

      // Se já existe uma requisição em andamento, aguarda ela
      if (globalCache.promise) {
        try {
          const data = await globalCache.promise
          // CRÍTICO: Sempre atualiza estado se dados existem no cache ou promise
          // Mesmo se componente foi desmontado/remontado, dados devem ser atualizados
          if (globalCache.data) {
            setUser(globalCache.data)
            setIsLoading(false)
          } else if (mountedRef.current) {
            // Fallback: se promise terminou mas cache não atualizou, usa dados da promise
            setUser(data)
            setIsLoading(false)
          }
        } catch (err) {
          if (mountedRef.current) {
            setError(err as Error)
            setIsLoading(false)
          }
        }
        return
      }

      // Cria nova requisição
      setIsLoading(true)
      setError(null)

      // Timeout de 30 segundos para carregamento de dados do usuário
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos

      const fetchPromise = fetch('/api/user/sidebar', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // IMPORTANTE: inclui cookies
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId)
      })
        .then(res => {
          if (!res.ok) {
            // Tenta ler o body do erro para mais detalhes
            return res.text().then(text => {
              throw new Error(`Failed to fetch user data: ${res.status} - ${res.statusText} - ${text}`)
            })
          }
          return res.json()
        })
        .then(data => {
          // Valida se os dados são válidos
          if (!data || !data.id) {
            throw new Error('Invalid user data received')
          }
          
          // CRÍTICO: Atualiza cache ANTES de limpar promise
          // Isso garante que mesmo se componente desmontar, próximo render terá os dados
          globalCache.data = data
          globalCache.timestamp = now
          globalCache.promise = null
          return data
        })
        .catch(err => {
          globalCache.promise = null
          if (process.env.NODE_ENV !== 'production') {
            console.error('[useUserCache] Fetch error:', err)
          }
          throw err
        })

      globalCache.promise = fetchPromise

      try {
        const data = await fetchPromise
        
        // Valida dados antes de atualizar
        if (!data || !data.id) {
          throw new Error('Invalid user data: missing id')
        }
        
        // CRÍTICO: Sempre atualiza o cache global primeiro, mesmo se componente desmontar
        globalCache.data = data
        globalCache.timestamp = now
        
        // CRÍTICO: SEMPRE atualiza o estado, mesmo que componente esteja desmontado
        // React vai aplicar o setState quando o componente remontar
        // Isso garante que o estado esteja correto para a próxima renderização
        setUser(data)
        setIsLoading(false)
      } catch (err) {
        // Limpa promise mesmo em erro
        globalCache.promise = null
        
        if (mountedRef.current) {
          setError(err as Error)
          setIsLoading(false)
          // Em caso de erro de autenticação, limpa o cache para evitar estados inconsistentes
          if (err instanceof Error && err.message.includes('401')) {
            // Erro de autenticação - limpa cache e aguarda nova tentativa quando autenticado
            globalCache.data = null
            globalCache.timestamp = 0
          }
        }
      }
    }

    fetchUser()
  }, [sessionStatus]) // ATENÇÃO: Não adicionar user/isLoading/error aqui - causaria loop infinito

  const mutate = () => {
    // Limpa cache para forçar nova requisição
    globalCache.data = null
    globalCache.timestamp = 0
    globalCache.promise = null
    setUser(null)
    setIsLoading(true)
    setError(null)
  }

  return {
    user,
    error,
    isLoading,
    mutate,
  }
}

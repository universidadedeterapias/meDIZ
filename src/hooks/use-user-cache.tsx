'use client'

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
      console.log('[useUserCache] ✨ Inicializando estado do cache na criação do hook')
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
      console.log('[useUserCache] 🧹 Limpando cache via evento')
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
      console.log('[useUserCache] 🔄 Cache atualizado após hook criado - Restaurando estado:', globalCache.data)
      setUser(globalCache.data)
      setIsLoading(false)
      return
    }
    
    // Se cache tem dados diferentes (atualização) → atualiza
    if (cacheValid && user && user.id !== globalCache.data.id) {
      console.log('[useUserCache] 🔄 Cache mais recente - Atualizando estado')
      setUser(globalCache.data)
      setIsLoading(false)
      return
    }
    
    // Se cache válido e user sincronizado mas ainda está loading → corrige
    if (cacheValid && user && user.id === globalCache.data.id && isLoading) {
      console.log('[useUserCache] 🔧 Corrigindo isLoading para false')
      setIsLoading(false)
      return
    }
  }, [user, isLoading]) // Não inclui sessionStatus para evitar loops

  // CRÍTICO: Polling de segurança quando estado está inconsistente (loading=true mas cache tem dados)
  // Back-up caso o useEffect de sincronização não detecte a mudança
  useEffect(() => {
    const shouldPoll = isLoading && !user && sessionStatus === 'authenticated'
    
    if (shouldPoll) {
      console.log('[useUserCache] 🔄 Polling de segurança ativado...')
      const interval = setInterval(() => {
        const now = Date.now()
        const cacheAge = now - globalCache.timestamp
        const cacheValid = globalCache.data && cacheAge < CACHE_DURATION
        
        if (cacheValid && !user) {
          console.log('[useUserCache] ⚡ Polling detectou cache - Restaurando estado')
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
      // Debug temporário para identificar problema
      console.log('[useUserCache] 🔍 ====== INÍCIO fetchUser ======')
      console.log('[useUserCache] Status da sessão:', sessionStatus)
      console.log('[useUserCache] Estado atual - user:', user, 'isLoading:', isLoading, 'error:', error)
      console.log('[useUserCache] Cache global:', { 
        hasData: !!globalCache.data, 
        timestamp: globalCache.timestamp,
        age: Date.now() - globalCache.timestamp,
        hasPromise: !!globalCache.promise
      })
      console.log('[useUserCache] mountedRef.current:', mountedRef.current)
      
      // Aguarda autenticação antes de buscar dados
      // MAS: Se cache já tem dados válidos, não precisa aguardar
      if (sessionStatus === 'loading') {
        // CRÍTICO: Se cache tem dados, usa eles imediatamente mesmo durante loading
        const now = Date.now()
        if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
          console.log('[useUserCache] ⚡ Sessão em loading MAS cache disponível - Usando cache!')
          setUser(globalCache.data)
          setIsLoading(false)
          return
        }
        console.log('[useUserCache] Aguardando sessão carregar... (cache vazio)')
        // Se user já está null e isLoading já está true, não precisa fazer nada
        // Mas se isLoading ainda não foi setado, mantém loading
        if (!user && !isLoading) {
          setIsLoading(true)
        }
        return // Aguarda a sessão carregar
      }

      // Se não autenticado, não busca dados e limpa cache
      if (sessionStatus === 'unauthenticated') {
        console.log('[useUserCache] Não autenticado, limpando cache')
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
        console.log('[useUserCache] Status desconhecido:', sessionStatus)
        return
      }

      console.log('[useUserCache] ✅ Autenticado! Prosseguindo com busca...')

      const now = Date.now()
      
      // Verifica se temos dados válidos no cache
      if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
        console.log('[useUserCache] ✅ Usando dados do cache:', globalCache.data)
        // CRÍTICO: Sempre atualiza estado se cache tem dados válidos
        // Não importa se mountedRef.current - dados já estão disponíveis
        setUser(globalCache.data)
        setIsLoading(false)
        console.log('[useUserCache] ✅ Estado atualizado do cache! user:', globalCache.data)
        return
      }

      console.log('[useUserCache] Cache expirado ou vazio, buscando novos dados...')

      // Se já existe uma requisição em andamento, aguarda ela
      if (globalCache.promise) {
        console.log('[useUserCache] Aguardando requisição existente...')
        try {
          const data = await globalCache.promise
          console.log('[useUserCache] Requisição existente concluída:', data)
          // CRÍTICO: Sempre atualiza estado se dados existem no cache ou promise
          // Mesmo se componente foi desmontado/remontado, dados devem ser atualizados
          if (globalCache.data) {
            setUser(globalCache.data)
            setIsLoading(false)
            console.log('[useUserCache] ✅ Estado atualizado da promise existente')
          } else if (mountedRef.current) {
            // Fallback: se promise terminou mas cache não atualizou, usa dados da promise
            setUser(data)
            setIsLoading(false)
          }
        } catch (err) {
          console.error('[useUserCache] Erro na promise existente:', err)
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

      console.log('[useUserCache] 🌐 Fazendo fetch para /api/user/sidebar...')
      const startTime = Date.now()
      const fetchPromise = fetch('/api/user/sidebar', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // IMPORTANTE: inclui cookies
      })
        .then(res => {
          const duration = Date.now() - startTime
          console.log('[useUserCache] 📡 Resposta recebida após', duration, 'ms:', {
            status: res.status,
            ok: res.ok,
            statusText: res.statusText,
            headers: Object.fromEntries(res.headers.entries())
          })
          if (!res.ok) {
            // Tenta ler o body do erro para mais detalhes
            return res.text().then(text => {
              console.error('[useUserCache] ❌ API error body:', text)
              throw new Error(`Failed to fetch user data: ${res.status} - ${res.statusText} - ${text}`)
            })
          }
          return res.json()
        })
        .then(data => {
          console.log('[useUserCache] Dados recebidos:', data)
          // Valida se os dados são válidos
          if (!data || !data.id) {
            console.error('[useUserCache] ❌ Invalid data received:', data)
            throw new Error('Invalid user data received')
          }
          
          console.log('[useUserCache] ✅ Dados válidos! Atualizando cache...')
          // CRÍTICO: Atualiza cache ANTES de limpar promise
          // Isso garante que mesmo se componente desmontar, próximo render terá os dados
          globalCache.data = data
          globalCache.timestamp = now
          globalCache.promise = null
          console.log('[useUserCache] ✅ Cache atualizado com sucesso!')
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
        const fetchDuration = Date.now() - startTime
        console.log('[useUserCache] ✅ Dados obtidos com sucesso após', fetchDuration, 'ms!', {
          id: data?.id,
          name: data?.name,
          email: data?.email,
          hasImage: !!data?.image,
          hasFullName: !!data?.fullName
        })
        
        // Valida dados antes de atualizar
        if (!data || !data.id) {
          console.error('[useUserCache] ❌ Dados inválidos recebidos:', data)
          throw new Error('Invalid user data: missing id')
        }
        
        // CRÍTICO: Sempre atualiza o cache global primeiro, mesmo se componente desmontar
        console.log('[useUserCache] 💾 Atualizando cache global...')
        globalCache.data = data
        globalCache.timestamp = now
        console.log('[useUserCache] ✅ Cache global atualizado:', {
          hasData: !!globalCache.data,
          timestamp: globalCache.timestamp
        })
        
        // CRÍTICO: SEMPRE atualiza o estado, mesmo que componente esteja desmontado
        // React vai aplicar o setState quando o componente remontar
        // Isso garante que o estado esteja correto para a próxima renderização
        console.log('[useUserCache] 🎯 Atualizando estado do hook...', {
          mounted: mountedRef.current,
          hasData: !!data
        })
        setUser(data)
        setIsLoading(false)
        console.log('[useUserCache] ✅ Estado atualizado! user:', data?.id, 'isLoading: false')
        
        // Nota: mesmo que mountedRef.current seja false, o setState ainda funciona
        // e será aplicado quando o componente remontar
        console.log('[useUserCache] ✅ ====== FIM fetchUser (sucesso) ======')
      } catch (err) {
        const errorDuration = Date.now() - startTime
        console.error('[useUserCache] ❌ Erro ao buscar dados após', errorDuration, 'ms:', {
          error: err,
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          mounted: mountedRef.current
        })
        // Limpa promise mesmo em erro
        globalCache.promise = null
        
        if (mountedRef.current) {
          console.log('[useUserCache] 🎯 Componente montado - Atualizando estado de erro...')
          setError(err as Error)
          setIsLoading(false)
          // Em caso de erro de autenticação, limpa o cache para evitar estados inconsistentes
          if (err instanceof Error && err.message.includes('401')) {
            console.warn('[useUserCache] 🔐 Auth error (401), clearing cache')
            // Erro de autenticação - limpa cache e aguarda nova tentativa quando autenticado
            globalCache.data = null
            globalCache.timestamp = 0
          } else if (err instanceof Error && (err.message.includes('404') || err.message.includes('500'))) {
            console.warn('[useUserCache] ⚠️ Server error, mantendo cache anterior se existir')
          }
        } else {
          console.warn('[useUserCache] ⚠️ Componente desmontado durante erro - estado não atualizado')
        }
        console.log('[useUserCache] ❌ ====== FIM fetchUser (erro) ======')
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

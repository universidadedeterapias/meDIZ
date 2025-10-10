'use client'

import { useState, useEffect, useRef } from 'react'

export interface SidebarUser {
  id: string
  name: string | null
  email: string
  image: string | null
  fullName: string | null
}

// Cache global simples para evitar múltiplas requisições
const globalCache: {
  data: SidebarUser | null
  timestamp: number
  promise: Promise<SidebarUser> | null
} = {
  data: null,
  timestamp: 0,
  promise: null
}

const CACHE_DURATION = 60000 // 1 minuto

/**
 * Hook otimizado para carregar dados do usuário com cache simples
 * Implementação nativa sem dependências externas
 */
export function useUserCache() {
  const [user, setUser] = useState<SidebarUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      const now = Date.now()
      
      // Verifica se temos dados válidos no cache
      if (globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION) {
        if (mountedRef.current) {
          setUser(globalCache.data)
          setIsLoading(false)
        }
        return
      }

      // Se já existe uma requisição em andamento, aguarda ela
      if (globalCache.promise) {
        try {
          const data = await globalCache.promise
          if (mountedRef.current) {
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

      const fetchPromise = fetch('/api/user/sidebar')
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user data')
          }
          return res.json()
        })
        .then(data => {
          // Atualiza cache
          globalCache.data = data
          globalCache.timestamp = now
          globalCache.promise = null
          return data
        })
        .catch(err => {
          globalCache.promise = null
          throw err
        })

      globalCache.promise = fetchPromise

      try {
        const data = await fetchPromise
        if (mountedRef.current) {
          setUser(data)
          setIsLoading(false)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err as Error)
          setIsLoading(false)
        }
      }
    }

    fetchUser()
  }, [])

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

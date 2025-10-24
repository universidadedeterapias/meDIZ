'use client'

import { useEffect, useState } from 'react'

interface SubscriptionStatus {
  isPremium: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Hook para verificar o status da assinatura do usuário
 * Inclui cache local para melhor performance
 */
export function useSubscriptionStatus(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    let cancelled = false

    async function checkSubscription() {
      try {
        // Verificar cache primeiro
        const cacheKey = 'subscription-status'
        const cacheTimestamp = localStorage.getItem(`${cacheKey}-timestamp`)
        const cachedStatus = localStorage.getItem(cacheKey)
        
        // Cache válido por 5 minutos
        const cacheValid = cacheTimestamp && 
          (Date.now() - parseInt(cacheTimestamp)) < 5 * 60 * 1000

        if (cacheValid && cachedStatus) {
          const isPremium = JSON.parse(cachedStatus)
          if (!cancelled) {
            setStatus({
              isPremium,
              isLoading: false,
              error: null
            })
          }
          return
        }

        // Busca status atual do servidor
        const response = await fetch('/api/stripe/subscription')
        
        if (!response.ok) {
          throw new Error('Erro ao verificar assinatura')
        }

        const data = await response.json()
        
        // Verifica se a assinatura está ativa e não expirou
        const isActive = data.status === 'active' || data.status === 'ACTIVE' || data.status === 'cancel_at_period_end'
        const notExpired = data.currentPeriodEnd ? new Date(data.currentPeriodEnd) > new Date() : false
        const isPremium = isActive && notExpired

        if (!cancelled) {
          setStatus({
            isPremium,
            isLoading: false,
            error: null
          })

          // Salva no cache
          localStorage.setItem(cacheKey, JSON.stringify(isPremium))
          localStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            isPremium: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })
        }
      }
    }

    checkSubscription()

    return () => {
      cancelled = true
    }
  }, [])

  return status
}

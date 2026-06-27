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
        const cacheKey = 'subscription-status-v3'
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
        console.log('[useSubscriptionStatus] 🔍 Buscando status da assinatura do servidor...')
        const response = await fetch('/api/stripe/subscription')
        
        if (!response.ok) {
          console.error('[useSubscriptionStatus] ❌ Erro na resposta:', response.status, response.statusText)
          throw new Error('Erro ao verificar assinatura')
        }

        const data = await response.json()
        console.log('[useSubscriptionStatus] 📦 Dados recebidos do servidor:', {
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          currentPeriodStart: data.currentPeriodStart,
          hasPremiumAccess: data.hasPremiumAccess
        })

        let isPremium: boolean
        if (typeof data.hasPremiumAccess === 'boolean') {
          isPremium = data.hasPremiumAccess
        } else {
          const statusLower = data.status?.toLowerCase() || ''
          const notExpired = data.currentPeriodEnd
            ? new Date(data.currentPeriodEnd) > new Date()
            : false
          const statusGrantsAccess = [
            'active',
            'trialing',
            'past_due',
            'cancel_at_period_end',
            'paused',
            'canceled',
            'cancelled'
          ].includes(statusLower)
          isPremium = statusGrantsAccess && notExpired
        }

        console.log('[useSubscriptionStatus] 🔍 Análise do status:', {
          statusOriginal: data.status,
          isPremium,
          currentPeriodEnd: data.currentPeriodEnd,
          now: new Date().toISOString()
        })

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

// src/lib/logout-utils.ts
// Utilitários para limpar todos os caches durante logout

import { clearGlobalCache } from '@/hooks/use-user-cache'

/**
 * Limpa o cache global do useUserCache
 */
export function clearUserCache(): void {
  if (typeof window === 'undefined') return
  
  // Limpar cache global diretamente
  clearGlobalCache()
  
  // Disparar evento para componentes que escutam
  window.dispatchEvent(new CustomEvent('clear-user-cache'))
}

/**
 * Limpa localStorage relacionado à aplicação
 */
export function clearLocalStorageCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    // Limpar cache de subscription
    localStorage.removeItem('subscription-status')
    localStorage.removeItem('subscription-status-timestamp')
    
    // Limpar outros caches que possam existir
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('subscription-') || key.startsWith('user-cache-'))) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('[logout-utils] Erro ao limpar localStorage:', error)
  }
}

/**
 * Limpa todos os caches da aplicação
 */
export function clearAllCaches(): void {
  clearUserCache()
  clearLocalStorageCache()
}


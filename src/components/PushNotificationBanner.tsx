'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Helper para logs apenas em desenvolvimento
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (message: string, data?: unknown) => {
  if (isDev) {
    console.log(`[PushNotificationBanner] ${message}`, data || '')
  }
}

export default function PushNotificationBanner() {
  const pathname = usePathname()
  const { isSupported, isSubscribed, isLoading, error, subscribe } =
    usePushNotifications()
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  
  // Resetar estado quando isSubscribed mudar de true para false (mudança de usuário)
  useEffect(() => {
    if (!isSubscribed && !isLoading) {
      setDismissed(false)
      setIsVisible(false)
    }
  }, [isSubscribed, isLoading])

  // Verificar se está em uma página de chat ou home
  const isChatPage = pathname?.startsWith('/chat') ?? false
  const isHomePage = pathname === '/' || pathname === '/chat'
  const shouldShowBanner = isChatPage || isHomePage

  useEffect(() => {

    debugLog('🔍 Verificando condições para exibir banner...')

    // Não mostrar banner se não estiver em página válida
    if (!shouldShowBanner) {
      debugLog('⏭️ Não está em página válida (chat ou home)')
      setIsVisible(false)
      return
    }

    // Aguardar verificação inicial terminar
    if (isLoading) {
      debugLog('⏳ Aguardando verificação inicial...')
      return
    }

    // Verificar se já aceitou notificações
    if (isSubscribed) {
      debugLog('✅ Já está inscrito, não mostrar banner')
      setIsVisible(false)
      setDismissed(true)
      return
    }

    // Verificar se já foi dispensado nesta sessão
    // Não usar localStorage para permitir reaparecer em nova sessão
    if (dismissed) {
      debugLog('⏭️ Banner foi dispensado nesta sessão')
      return
    }

    // Verificar se push é suportado
    if (!isSupported) {
      debugLog('⏭️ Push não é suportado')
      setIsVisible(false)
      return
    }

    // IMPORTANTE: Se já está inscrito, garantir que o banner não apareça
    // e marcar como dispensado permanentemente nesta sessão
    if (isSubscribed) {
      debugLog('✅ Já está inscrito, garantindo que banner não apareça')
      setIsVisible(false)
      setDismissed(true)
      return
    }

    // Mostrar banner apenas se:
    // 1. Está em página válida (chat ou home)
    // 2. Push é suportado
    // 3. Não está inscrito (verificação já terminou)
    // 4. Não foi dispensado
    // 5. Verificação inicial terminou (não está mais carregando)
    if (shouldShowBanner && isSupported && !isSubscribed && !dismissed && !isLoading) {
      debugLog('✅ Todas as condições atendidas, mostrando banner em 2 segundos...')
      // Aguardar um pouco antes de mostrar (melhor UX)
      const timer = setTimeout(() => {
        // Verificar novamente antes de mostrar (double-check)
        if (!isSubscribed && !dismissed) {
          debugLog('👁️ Exibindo banner agora!')
          setIsVisible(true)
        } else {
          debugLog('⏭️ Condições mudaram, não exibindo banner')
        }
      }, 2000) // 2 segundos após carregar

      return () => clearTimeout(timer)
    } else {
      debugLog('⏭️ Condições não atendidas para exibir banner')
    }
  }, [shouldShowBanner, isSupported, isSubscribed, dismissed, isLoading, pathname])

  const handleDismiss = () => {
    debugLog('👆 Usuário clicou em "Agora não" - banner dispensado apenas nesta sessão')
    setIsVisible(false)
    setDismissed(true)
    // Não salvar no servidor nem localStorage - permite reaparecer em nova sessão
    // Se o usuário quiser ativar, pode fazer depois
  }

  const handleSubscribe = async () => {
    try {
      debugLog('👆 Usuário clicou em "Ativar notificações"')
      await subscribe()
      // O hook atualiza isSubscribed após sucesso e salva no servidor
      // Forçar fechamento imediato do banner
      setIsVisible(false)
      setDismissed(true)
      debugLog('✅ Notificações ativadas com sucesso - banner fechado')
    } catch (err) {
      // Erro já é tratado pelo hook e exibido no banner
      debugLog('❌ Erro ao ativar notificações')
      if (isDev) {
        console.error('Erro ao inscrever:', err)
      }
      // Não fecha o banner em caso de erro para o usuário ver a mensagem
    }
  }

  // Não mostrar se:
  // 1. Não estiver em página válida (chat ou home)
  // 2. Não for suportado
  // 3. Já estiver inscrito
  // 4. Foi dispensado
  // 5. Não está visível
  // 6. Ainda está carregando
  if (!shouldShowBanner || !isSupported || isSubscribed || dismissed || !isVisible || isLoading) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center animate-in slide-in-from-top-5 px-2 pt-2 sm:px-4 sm:pt-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 sm:p-2.5 md:p-4 flex items-start gap-1 sm:gap-1.5 md:gap-3 w-full max-w-[calc(100vw-0.5rem)] sm:max-w-md md:max-w-2xl">
        <div className="flex-shrink-0 mt-0.5 sm:mt-1">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1 truncate">
            Ative as notificações
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 md:mb-3 line-clamp-2 break-words">
            Receba lembretes personalizados mesmo com o app fechado
          </p>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-1 sm:mb-2 line-clamp-2 break-words">{error}</p>
          )}

          <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-row">
            <Button
              size="sm"
              onClick={handleSubscribe}
              disabled={isLoading}
              className="text-xs h-7 sm:h-8 w-full sm:w-auto px-2 sm:px-3 flex-shrink-0"
            >
              {isLoading ? 'Ativando...' : 'Ativar notificações'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-xs h-7 sm:h-8 w-full sm:w-auto px-2 sm:px-3 flex-shrink-0"
            >
              Agora não
            </Button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-0.5 sm:mt-1"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  )
}


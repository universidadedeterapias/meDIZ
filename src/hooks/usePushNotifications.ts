'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'


interface UsePushNotificationsReturn {
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<'default' | 'granted' | 'denied'>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { data: session, status: sessionStatus } = useSession()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar status da subscription real (não apenas preferência)
  const checkSubscriptionStatus = useCallback(async () => {
    const log = (message: string, data?: unknown) => {
      console.log(`[usePushNotifications] ${message}`, data || '')
    }

    try {
      log('🔍 Verificando status da subscription...')
      
      // IMPORTANTE: Marcar como loading durante toda a verificação
      setIsLoading(true)

      // 1. PRIMEIRO: Verificar subscription local (não precisa de autenticação)
      let hasLocalSubscription = false
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          hasLocalSubscription = !!subscription
          
          if (hasLocalSubscription) {
            log('✅ Subscription push local encontrada', {
              endpoint: subscription.endpoint.substring(0, 50) + '...'
            })
          } else {
            log('❌ Nenhuma subscription push local encontrada')
          }
        } catch (err) {
          log('⚠️ Erro ao verificar subscription local:', err)
        }
      }

      // 2. Verificar subscription no servidor (verificação real)
      try {
        const subscriptionResponse = await fetch('/api/push/subscription-status')
        
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json()
          
          // Se existe subscription registrada no servidor, está inscrito
          if (subscriptionData.hasSubscription === true) {
            setIsSubscribed(true)
            setIsLoading(false)
            return
          }
        } else if (subscriptionResponse.status === 401) {
          // Não autenticado - usar subscription local como fallback
          if (hasLocalSubscription) {
            setIsSubscribed(true)
            setIsLoading(false)
            return
          }
        }
        
        // Se chegou aqui, não tem subscription no servidor
        // Verificar preferência apenas para contexto, mas não confiar nela
        try {
          const prefResponse = await fetch('/api/user/notifications-preference')
          if (prefResponse.ok) {
            const prefData = await prefResponse.json()
            // Se preferência está true mas não tem subscription, algo está errado
            // Marcar como não inscrito para forçar novo registro
            if (prefData.enabled === true && !hasLocalSubscription) {
              // Preferência está true mas não tem subscription - estado inconsistente
              // Marcar como não inscrito para permitir novo registro
              setIsSubscribed(false)
              setIsLoading(false)
              return
            }
          }
        } catch {
          // Ignorar erro na verificação de preferência
        }
        
        // Se tem subscription local mas não no servidor, considerar como não inscrito
        // para forçar novo registro
        setIsSubscribed(false)
        setIsLoading(false)
        return
      } catch {
        // Em caso de erro, usar subscription local como fallback
        setIsSubscribed(hasLocalSubscription)
        setIsLoading(false)
        return
      }
    } catch (err) {
      log('❌ Erro ao verificar subscription:', err)
      setIsSubscribed(false)
      setIsLoading(false)
    }
  }, [])

  // Verificar suporte e status inicial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator
      setIsSupported(supported)

      if (supported) {
        // Verificar status após um pequeno delay para garantir que o service worker está pronto
        // O checkSubscriptionStatus já marca isLoading internamente
        const timer = setTimeout(() => {
          checkSubscriptionStatus()
        }, 1000) // 1 segundo após montar o componente

        return () => {
          clearTimeout(timer)
        }
      } else {
        console.log('[usePushNotifications] ⚠️ Push notifications não são suportadas neste navegador')
        setIsLoading(false)
      }
    }
  }, [checkSubscriptionStatus])

  // Reexecutar verificação quando a sessão mudar (mudança de usuário)
  useEffect(() => {
    if (sessionStatus === 'authenticated' && isSupported) {
      // Resetar estado quando sessão muda
      setIsSubscribed(false)
      setError(null)
      // Reexecutar verificação para o novo usuário
      const timer = setTimeout(() => {
        checkSubscriptionStatus()
      }, 500)
      
      return () => {
        clearTimeout(timer)
      }
    } else if (sessionStatus === 'unauthenticated') {
      // Limpar estado quando deslogar
      setIsSubscribed(false)
      setError(null)
      setIsLoading(false)
    }
  }, [session?.user?.id, sessionStatus, isSupported, checkSubscriptionStatus])

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<'default' | 'granted' | 'denied'> => {
    if (!('Notification' in window)) {
      throw new Error('Notificações não são suportadas neste navegador')
    }

    const permission = await window.Notification.requestPermission()
    return permission
  }, [])

  // Registrar subscription push completa
  const subscribe = useCallback(async () => {
    const log = (message: string, data?: unknown) => {
      console.log(`[usePushNotifications] ${message}`, data || '')
    }

    setIsLoading(true)
    setError(null)

    try {
      log('========== INÍCIO REGISTRO DE SUBSCRIPTION ==========')

      // 1. Verificar suporte
      if (!('Notification' in window)) {
        throw new Error('Notificações não são suportadas neste navegador')
      }

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker não é suportado neste navegador')
      }

      // 2. Solicitar permissão de notificação
      log('1️⃣ Solicitando permissão de notificação...')
      const permission = await window.Notification.requestPermission()
      log('📋 Permissão:', permission)

      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada')
      }

      // 3. Registrar service worker (se necessário)
      log('2️⃣ Registrando/obtendo service worker...')
      let registration: globalThis.ServiceWorkerRegistration

      // Verificar se já existe um service worker registrado
      const existingRegistration = await navigator.serviceWorker.getRegistration()
      
      if (existingRegistration && existingRegistration.active) {
        log('✅ Service Worker já está registrado e ativo')
        registration = existingRegistration
      } else {
        log('📝 Registrando novo service worker...')
        try {
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          
          // Aguardar o service worker estar ativo
          if (registration.installing) {
            log('⏳ Service Worker está instalando...')
            await new Promise<void>((resolve) => {
              registration.installing!.addEventListener('statechange', () => {
                if (registration.installing!.state === 'activated') {
                  log('✅ Service Worker instalado e ativado')
                  resolve()
                }
              })
            })
          } else if (registration.waiting) {
            log('⏳ Service Worker está aguardando...')
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            await new Promise<void>((resolve) => {
              registration.waiting!.addEventListener('statechange', () => {
                if (registration.waiting!.state === 'activated') {
                  log('✅ Service Worker ativado')
                  resolve()
                }
              })
            })
          }
          
          // Aguardar estar pronto
          registration = await navigator.serviceWorker.ready
          log('✅ Service Worker registrado e pronto')
        } catch (err) {
          log('❌ Erro ao registrar service worker:', err)
          throw new Error(`Erro ao registrar service worker: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
        }
      }

      // Verificar se o service worker está realmente ativo
      if (!registration.active) {
        throw new Error('Service Worker não está ativo. Aguarde alguns segundos e tente novamente.')
      }

      log('✅ Service Worker está ativo', {
        scope: registration.scope,
        active: !!registration.active
      })

      // 4. Obter chave pública VAPID
      log('3️⃣ Obtendo chave pública VAPID...')
      const vapidResponse = await fetch('/api/push/vapid-public-key')
      
      if (!vapidResponse.ok) {
        throw new Error('Erro ao obter chave pública VAPID')
      }

      const vapidData = await vapidResponse.json()
      const vapidPublicKey = vapidData.publicKey
      // Não logar chave completa por segurança
      log('✅ Chave pública VAPID obtida', { 
        keyLength: vapidPublicKey?.length || 0,
        keyPrefix: vapidPublicKey ? vapidPublicKey.substring(0, 8) + '...' : 'N/A'
      })

      if (!vapidPublicKey) {
        throw new Error('Chave pública VAPID não configurada no servidor')
      }

      // 5. Verificar se pushManager está disponível
      if (!registration.pushManager) {
        throw new Error('Push Manager não está disponível no service worker')
      }

      log('✅ Push Manager disponível')

      // 6. Converter chave para formato Uint8Array
      log('5️⃣ Convertendo chave VAPID para Uint8Array...')
      let applicationServerKey: Uint8Array
      
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
        log('✅ Chave convertida com sucesso', {
          length: applicationServerKey.length,
          firstBytes: Array.from(applicationServerKey.slice(0, 5))
        })
      } catch (err) {
        log('❌ Erro ao converter chave VAPID:', err)
        throw new Error(`Erro ao converter chave VAPID: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
      }

      // 7. Obter ou criar subscription push
      log('6️⃣ Obtendo/criando subscription push...')
      let subscription: globalThis.PushSubscription | null = null

      try {
        subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          log('✅ Subscription já existe, reutilizando', {
            endpoint: subscription.endpoint.substring(0, 50) + '...'
          })
        }
      } catch (err) {
        log('⚠️ Erro ao obter subscription existente:', err)
        // Continuar para criar nova
      }

      if (!subscription) {
        log('📝 Criando nova subscription...')
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
          })
          log('✅ Nova subscription criada com sucesso', {
            endpoint: subscription.endpoint.substring(0, 50) + '...',
            keys: {
              hasP256dh: !!subscription.getKey('p256dh'),
              hasAuth: !!subscription.getKey('auth')
            }
          })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
          log('❌ ERRO ao criar subscription:', {
            message: errorMessage,
            name: err instanceof Error ? err.name : 'Unknown',
            stack: err instanceof Error ? err.stack?.substring(0, 300) : undefined
          })
          
          // Mensagens de erro mais amigáveis
          if (errorMessage.includes('push service error') || errorMessage.includes('Registration failed')) {
            throw new Error('Erro ao conectar com o serviço de push. Verifique se as chaves VAPID estão corretas e se o navegador suporta push notifications.')
          }
          
          throw new Error(`Erro ao criar subscription: ${errorMessage}`)
        }
      }

      // 8. Extrair dados da subscription
      log('7️⃣ Extraindo dados da subscription...')
      const p256dhKey = subscription.getKey('p256dh')
      const authKey = subscription.getKey('auth')

      if (!p256dhKey || !authKey) {
        throw new Error('Subscription não contém as chaves necessárias (p256dh ou auth)')
      }

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey)
        },
        userAgent: navigator.userAgent
      }

      log('✅ Dados extraídos', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        hasP256dh: !!subscriptionData.keys.p256dh,
        hasAuth: !!subscriptionData.keys.auth,
        p256dhLength: subscriptionData.keys.p256dh.length,
        authLength: subscriptionData.keys.auth.length
      })

      // 9. Registrando subscription no servidor
      log('8️⃣ Registrando subscription no servidor...')

      // 8. Registrar subscription no servidor
      const subscribeResponse = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      })

      log('📊 Resposta do servidor:', {
        status: subscribeResponse.status,
        ok: subscribeResponse.ok
      })

      if (!subscribeResponse.ok) {
        const errorData = await subscribeResponse.json().catch(() => ({ error: 'Erro desconhecido' }))
        log('❌ Erro ao registrar subscription:', errorData)
        throw new Error(errorData.error || 'Erro ao registrar subscription no servidor')
      }

      const subscribeResult = await subscribeResponse.json()
      log('✅ Subscription registrada no servidor:', subscribeResult)

      // 10. Salvar preferência no servidor
      log('9️⃣ Salvando preferência no servidor...')
      const prefResponse = await fetch('/api/user/notifications-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: true })
      })

      if (!prefResponse.ok) {
        log('⚠️ Erro ao salvar preferência, mas subscription foi registrada')
        const errorData = await prefResponse.json().catch(() => ({}))
        log('Erro:', errorData)
      } else {
        const prefResult = await prefResponse.json()
        log('✅ Preferência salva:', prefResult)
      }

      // 10. Atualizar estado e reexecutar verificação para garantir sincronização
      setIsSubscribed(true)
      log('========== REGISTRO CONCLUÍDO COM SUCESSO ==========')
      
      // Reexecutar verificação após um pequeno delay para garantir que o servidor processou
      setTimeout(() => {
        checkSubscriptionStatus()
      }, 1000)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao ativar notificações'
      log('❌ ERRO:', errorMessage)
      setError(errorMessage)
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }, [checkSubscriptionStatus])

  // Funções auxiliares para conversão de dados
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    try {
      // Remover espaços e quebras de linha
      const cleanBase64 = base64String.trim().replace(/\s/g, '')
      
      // Adicionar padding se necessário
      const padding = '='.repeat((4 - (cleanBase64.length % 4)) % 4)
      const base64 = (cleanBase64 + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      
      // Decodificar base64
      const rawData = window.atob(base64)
      
      // Converter para Uint8Array
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }
      
      // Validar tamanho (chave VAPID deve ter 65 bytes)
      if (outputArray.length !== 65) {
        throw new Error(`Tamanho inválido da chave VAPID: esperado 65 bytes, obtido ${outputArray.length} bytes`)
      }
      
      return outputArray
    } catch (error) {
      throw new Error(`Erro ao converter chave VAPID: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // Desativar notificações
  const unsubscribe = useCallback(async () => {
    const log = (message: string, data?: unknown) => {
      console.log(`[usePushNotifications] ${message}`, data || '')
    }

    setIsLoading(true)
    setError(null)

    try {
      log('========== INÍCIO DESATIVAÇÃO ==========')

      // 1. Remover subscription do service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          
          if (subscription) {
            log('🗑️ Removendo subscription do service worker...')
            await subscription.unsubscribe()
            log('✅ Subscription removida do service worker')
          }
        } catch (err) {
          log('⚠️ Erro ao remover subscription do service worker:', err)
        }
      }

      // 2. Remover subscription do servidor (se houver endpoint)
      // Nota: O endpoint /api/push/unsubscribe pode ser usado aqui se existir

      // 3. Salvar preferência como desativada
      log('📝 Salvando preferência como desativada...')
      const response = await fetch('/api/user/notifications-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: false })
      })

      if (!response.ok) {
        throw new Error('Erro ao desativar notificações')
      }

      log('✅ Preferência desativada')
      setIsSubscribed(false)
      log('========== DESATIVAÇÃO CONCLUÍDA ==========')

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao desativar notificações'
      log('❌ ERRO:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission
  }
}


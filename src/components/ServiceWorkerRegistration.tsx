'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      // Registrar service worker (funciona em dev e produção)
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/' // Escopo raiz para capturar todas as notificações
        })
        .then((registration) => {
          console.log('[SW] Service Worker registrado com sucesso:', registration.scope)
          console.log('[SW] Service Worker ativo:', registration.active?.state)
          
          // Aguardar Service Worker estar pronto
          if (registration.installing) {
            console.log('[SW] Service Worker está instalando...')
            registration.installing.addEventListener('statechange', () => {
              if (registration.installing?.state === 'activated') {
                console.log('[SW] ✅ Service Worker ativado e pronto para notificações em background')
              }
            })
          } else if (registration.waiting) {
            console.log('[SW] Service Worker aguardando ativação...')
          } else if (registration.active) {
            console.log('[SW] ✅ Service Worker já está ativo e pronto para notificações em background')
          }

          // Verificar atualizações periodicamente
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // A cada hora

          // Listener para nova versão disponível
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log('[SW] Nova versão disponível')
                  // Opcional: mostrar notificação para o usuário atualizar
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[SW] Erro ao registrar Service Worker:', error)
        })

      // Listener para mudanças de controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Novo Service Worker assumiu controle')
        console.log('[SW] ✅ Pronto para receber notificações push em background')
        // Recarregar página se necessário
        // window.location.reload()
      })
      
      // Verificar se Service Worker já está ativo
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[SW] ✅ Service Worker pronto para notificações em background')
        console.log('[SW] Status:', registration.active?.state)
      })
    } else {
      console.warn('[SW] Service Worker não suportado neste navegador')
    }
  }, [])

  return null
}


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
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registrado com sucesso:', registration.scope)

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
        // Recarregar página se necessário
        // window.location.reload()
      })
    }
  }, [])

  return null
}


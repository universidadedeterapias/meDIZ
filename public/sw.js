// Service Worker para PWA e Notificações Push
const CACHE_NAME = 'mediz-v1'
const RUNTIME_CACHE = 'mediz-runtime-v1'

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado')
  self.skipWaiting()
})

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => {
            console.log('[SW] Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )
  return self.clients.claim()
})

// Interceptar requisições para cache
self.addEventListener('fetch', (event) => {
  // Não fazer cache de requisições de API
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

// Gerenciar notificações push
self.addEventListener('push', (event) => {
  console.log('[SW] Notificação push recebida:', event)

  let notificationData = {
    title: 'meDIZ',
    body: 'Você tem uma nova notificação',
    icon: '/imgs/logo192.png',
    badge: '/imgs/logo192.png',
    tag: 'mediz-notification',
    requireInteraction: false,
    data: {}
  }

  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = {
        ...notificationData,
        ...data,
        data: data.data || {}
      }
    } catch (e) {
      // Se não for JSON, usar como texto
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: notificationData.actions || [],
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    })
  )
})

// Gerenciar cliques em notificações
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event)

  event.notification.close()

  const data = event.notification.data || {}
  const urlToOpen = data.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Verificar se já existe uma janela aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }

      // Se não existe, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Gerenciar ações de notificação (botões)
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificação fechada:', event)
})

// Sincronização em background (para quando voltar online)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(
      fetch('/api/push/check-reminders')
        .then((response) => response.json())
        .catch((error) => {
          console.error('[SW] Erro ao sincronizar lembretes:', error)
        })
    )
  }
})

// Gerenciar mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('[SW] Mensagem recebida:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})







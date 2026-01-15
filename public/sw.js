// Service Worker para PWA e Notificações Push
const CACHE_NAME = 'mediz-v1'
const RUNTIME_CACHE = 'mediz-runtime-v1'

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado')
  // skipWaiting() garante que o SW seja ativado imediatamente
  // Isso é importante para notificações push funcionarem em background
  self.skipWaiting()
})

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado')
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
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
      }),
      // clients.claim() garante que o SW controle todas as páginas
      // Isso é CRÍTICO para notificações push funcionarem quando o app está fechado
      self.clients.claim()
    ])
  )
  console.log('[SW] Service Worker pronto para receber notificações push em background')
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
// IMPORTANTE: Este handler funciona mesmo quando o app está fechado
// O Service Worker continua rodando em background
self.addEventListener('push', (event) => {
  console.log('[SW] Notificação push recebida (app pode estar fechado):', event)

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

  // event.waitUntil() é CRÍTICO para garantir que a notificação seja exibida
  // mesmo quando o app está fechado
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
      timestamp: Date.now(),
      // silent: false garante que a notificação seja exibida mesmo em background
      silent: false
    })
  )
  
  console.log('[SW] Notificação exibida com sucesso (app pode estar fechado)')
})

// Gerenciar cliques em notificações
// IMPORTANTE: Funciona em desktop e mobile (Android e iOS)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada (mobile ou desktop):', event)

  event.notification.close()

  const data = event.notification.data || {}
  const urlToOpen = data.url || '/'

  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Verificar se já existe uma janela/aba aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        // Verificar se é a mesma URL ou domínio
        if (client.url.includes(urlToOpen) || client.url.includes(self.location.origin)) {
          if ('focus' in client) {
            return client.focus()
          }
        }
      }

      // Se não existe, abrir nova janela/aba
      // Funciona em desktop (nova aba) e mobile (abre app)
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







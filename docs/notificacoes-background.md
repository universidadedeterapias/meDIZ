# 🔔 Notificações Push em Background (App Fechado)

## ✅ Como Funciona

As notificações push **DEVEM funcionar** mesmo quando o app está fechado no desktop. Isso é possível porque:

1. **Service Worker roda em background** - O Service Worker continua ativo mesmo após fechar o navegador/app
2. **Push API** - O navegador recebe notificações push diretamente do servidor
3. **Event Listener** - O Service Worker escuta eventos `push` mesmo sem página aberta

## 🔍 Verificando se Está Funcionando

### 1. Verificar Service Worker Ativo

1. Abra o DevTools (F12)
2. Vá para a aba **Application** (Chrome) ou **Storage** (Firefox)
3. No menu lateral, clique em **Service Workers**
4. Verifique se há um Service Worker **ativo** (status: "activated and is running")

### 2. Testar Notificação em Background

**Passo a passo:**

1. **Permita notificações** no site (se ainda não permitiu)
2. **Feche completamente o navegador** (todas as abas do site)
3. **Aguarde alguns minutos** (ou use o painel admin para enviar um lembrete)
4. **A notificação deve aparecer** mesmo com o navegador fechado

### 3. Verificar Permissões

1. No Chrome: `chrome://settings/content/notifications`
2. Verifique se `mediz.app` está na lista de sites permitidos
3. Certifique-se de que não está bloqueado

## ⚠️ Problemas Comuns

### ❌ Notificações só funcionam com app aberto

**Possíveis causas:**

1. **Service Worker não está ativo**
   - Solução: Verificar no DevTools > Application > Service Workers
   - Recarregar a página e verificar se o SW está "activated"

2. **Permissões bloqueadas**
   - Solução: Verificar configurações de notificação do navegador
   - Permitir notificações para `mediz.app`

3. **Service Worker não está persistindo**
   - Solução: Verificar se `self.skipWaiting()` e `clients.claim()` estão no código
   - Verificar se o SW está sendo registrado corretamente

4. **HTTPS não configurado** (em desenvolvimento)
   - Solução: Service Workers requerem HTTPS (exceto localhost)
   - Em produção, Vercel fornece HTTPS automaticamente

### ❌ Notificações não aparecem

**Checklist:**

- [ ] Service Worker está registrado e ativo?
- [ ] Permissões de notificação foram concedidas?
- [ ] Subscription está registrada no banco de dados?
- [ ] VAPID keys estão configuradas?
- [ ] HTTPS está ativo (em produção)?
- [ ] Navegador suporta Push API?

## 🔧 Como Garantir que Funciona

### 1. Verificar Service Worker

No console do navegador (F12):

```javascript
// Verificar se Service Worker está ativo
navigator.serviceWorker.getRegistration().then(reg => {
  if (reg) {
    console.log('✅ Service Worker ativo:', reg.active?.state)
  } else {
    console.log('❌ Service Worker não encontrado')
  }
})

// Verificar subscriptions
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    if (sub) {
      console.log('✅ Subscription ativa:', sub.endpoint)
    } else {
      console.log('❌ Nenhuma subscription')
    }
  })
})
```

### 2. Testar Manualmente

1. **Abrir o site** e permitir notificações
2. **Verificar no DevTools** que o Service Worker está ativo
3. **Fechar todas as abas** do site
4. **Aguardar** alguns minutos
5. **Enviar uma notificação** (via painel admin ou cron job)
6. **A notificação deve aparecer** mesmo com navegador fechado

### 3. Verificar Logs

No Service Worker (`sw.js`), os logs aparecem no DevTools:

1. Abra DevTools (F12)
2. Vá para **Application** > **Service Workers**
3. Clique em **inspect** no Service Worker ativo
4. Veja os logs quando uma notificação é recebida

## 📱 Diferenças por Plataforma

### Desktop (Chrome/Edge/Firefox)
- ✅ Funciona com app fechado
- ✅ Service Worker persiste em background
- ✅ Notificações aparecem mesmo sem navegador aberto

### Mobile Android
- ✅ Funciona com app fechado
- ✅ Notificações aparecem na barra de notificações
- ✅ Funciona via FCM (Firebase Cloud Messaging)
- ✅ Funciona no Chrome automaticamente
- ✅ Não precisa instalar como PWA (mas pode)

### Mobile iOS
- ✅ Funciona com app fechado (iOS 16.4+)
- ⚠️ **CRÍTICO:** Requer que o app seja adicionado à tela inicial (PWA)
- ⚠️ **CRÍTICO:** Funciona apenas no Safari
- ⚠️ Deve abrir o app da tela inicial pelo menos uma vez

## 🎯 Teste Completo

Para garantir que está funcionando:

1. **Registre uma subscription** (permita notificações)
2. **Verifique no banco** que a subscription foi salva
3. **Feche completamente o navegador**
4. **Aguarde 5 minutos**
5. **Envie uma notificação** (via admin ou cron)
6. **A notificação deve aparecer** mesmo com navegador fechado

Se não aparecer, verifique:
- Service Worker está ativo?
- Permissões estão concedidas?
- Subscription está no banco?
- VAPID keys estão configuradas?

## 💡 Dicas

- **Service Worker persiste** mesmo após fechar o navegador
- **Notificações push** são recebidas diretamente pelo navegador
- **Não precisa** ter o site aberto para receber notificações
- **Funciona em background** automaticamente quando configurado corretamente

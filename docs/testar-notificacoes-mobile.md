# 📱 Testar Notificações Push no Celular (App Fechado)

## ✅ Sim, DEVE Funcionar!

As notificações push **funcionam no celular mesmo com o app fechado**, tanto Android quanto iOS (16.4+).

## 🤖 Android (Chrome)

### Como Funciona:
- ✅ **Funciona com app fechado** - Service Worker continua ativo
- ✅ **Notificações aparecem na barra** - Mesmo com navegador fechado
- ✅ **Funciona via FCM** - Firebase Cloud Messaging (automático)
- ✅ **Não precisa instalar** - Funciona no navegador Chrome

### Como Testar:

1. **Abrir o site no Chrome Android**
   - Acesse: `https://mediz.app`
   - Use Chrome (não outros navegadores)

2. **Permitir notificações**
   - Quando aparecer o banner, toque em "Permitir"
   - Ou vá em Configurações > Notificações > Permitir

3. **Verificar Service Worker**
   - Abra DevTools (menu > Mais ferramentas > Ferramentas do desenvolvedor)
   - Vá em Application > Service Workers
   - Deve mostrar "activated and is running"

4. **Fechar o app completamente**
   - Feche todas as abas do Chrome
   - Ou feche o Chrome completamente

5. **Aguardar e testar**
   - Aguarde alguns minutos
   - Envie uma notificação (via admin ou aguarde cron job)
   - **A notificação deve aparecer** na barra de notificações do Android

### Verificar Permissões Android:

1. **Configurações do Android**
   - Configurações > Apps > Chrome > Notificações
   - Certifique-se de que está "Permitido"

2. **Configurações do Chrome**
   - Chrome > Configurações > Notificações do site
   - Verifique se `mediz.app` está permitido

## 🍎 iOS (Safari)

### Como Funciona:
- ✅ **Funciona com app fechado** (iOS 16.4+)
- ⚠️ **Requer PWA instalado** - Deve adicionar à tela inicial
- ⚠️ **Apenas Safari** - Não funciona em outros navegadores iOS
- ✅ **Notificações aparecem** mesmo com app fechado

### Como Testar:

1. **Abrir no Safari iOS**
   - Acesse: `https://mediz.app`
   - **IMPORTANTE:** Use Safari (não Chrome ou outros)

2. **Adicionar à Tela Inicial (PWA)**
   - Toque no botão de compartilhar (□↗)
   - Role para baixo e toque em "Adicionar à Tela de Início"
   - Toque em "Adicionar"
   - **CRÍTICO:** Sem isso, notificações não funcionam em background!

3. **Abrir o app da tela inicial**
   - Toque no ícone do meDIZ na tela inicial
   - O app deve abrir em modo standalone (sem barra do Safari)

4. **Permitir notificações**
   - Quando aparecer o banner, toque em "Permitir"
   - Ou vá em Configurações > Safari > Notificações do site

5. **Fechar o app completamente**
   - Feche o app (swipe up e feche)
   - Ou volte para a tela inicial

6. **Aguardar e testar**
   - Aguarde alguns minutos
   - Envie uma notificação (via admin ou aguarde cron job)
   - **A notificação deve aparecer** mesmo com app fechado

### Verificar Permissões iOS:

1. **Configurações do iOS**
   - Configurações > Notificações > meDIZ
   - Certifique-se de que está "Permitido"
   - Ative "Permitir Notificações"

2. **Configurações do Safari**
   - Configurações > Safari > Notificações do site
   - Verifique se `mediz.app` está permitido

## ⚠️ Problemas Comuns no Mobile

### ❌ Notificações não aparecem no Android

**Possíveis causas:**

1. **Chrome não está permitido**
   - Solução: Configurações > Apps > Chrome > Notificações > Permitir

2. **Site bloqueado**
   - Solução: Chrome > Configurações > Notificações do site > Permitir mediz.app

3. **Service Worker não ativo**
   - Solução: Verificar no DevTools > Application > Service Workers

4. **Bateria otimizada**
   - Solução: Configurações > Apps > Chrome > Bateria > Não otimizar

### ❌ Notificações não aparecem no iOS

**Possíveis causas:**

1. **App não foi adicionado à tela inicial**
   - ⚠️ **CRÍTICO:** iOS requer PWA instalado para notificações em background
   - Solução: Adicionar à tela inicial via Safari

2. **Não está usando Safari**
   - ⚠️ **CRÍTICO:** iOS só funciona no Safari
   - Solução: Usar Safari, não Chrome ou outros navegadores

3. **Permissões bloqueadas**
   - Solução: Configurações > Notificações > meDIZ > Permitir

4. **iOS versão antiga**
   - ⚠️ Requer iOS 16.4 ou superior
   - Solução: Atualizar iOS

5. **App não foi aberto após instalar**
   - Solução: Abrir o app da tela inicial pelo menos uma vez

## 🔍 Verificar se Está Funcionando

### No Android (Chrome):

1. **Abrir DevTools remoto:**
   - Conecte o celular via USB
   - Chrome no PC: `chrome://inspect`
   - Selecione o dispositivo
   - Vá em Application > Service Workers

2. **Verificar no console:**
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW ativo:', reg?.active?.state)
   })
   ```

### No iOS (Safari):

1. **Abrir Web Inspector:**
   - iPhone: Configurações > Safari > Avançado > Web Inspector (ativar)
   - Mac: Safari > Desenvolvimento > [Seu iPhone] > mediz.app
   - Vá em Storage > Service Workers

2. **Verificar no console:**
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW ativo:', reg?.active?.state)
   })
   ```

## ✅ Checklist de Teste Mobile

### Android:
- [ ] Chrome está permitido nas notificações do Android
- [ ] Site está permitido nas notificações do Chrome
- [ ] Service Worker está ativo (verificar DevTools)
- [ ] Subscription está registrada no banco
- [ ] Testou fechando o Chrome completamente
- [ ] Notificação apareceu na barra de notificações

### iOS:
- [ ] App foi adicionado à tela inicial (PWA)
- [ ] Está usando Safari (não outros navegadores)
- [ ] App foi aberto da tela inicial pelo menos uma vez
- [ ] Permissões de notificação estão ativas
- [ ] iOS 16.4 ou superior
- [ ] Testou fechando o app completamente
- [ ] Notificação apareceu mesmo com app fechado

## 💡 Dicas Importantes

### Android:
- ✅ Funciona no Chrome automaticamente
- ✅ Não precisa instalar como PWA (mas pode)
- ✅ Service Worker persiste mesmo com Chrome fechado
- ✅ Notificações aparecem na barra do Android

### iOS:
- ⚠️ **DEVE adicionar à tela inicial** (PWA obrigatório)
- ⚠️ **DEVE usar Safari** (não funciona em outros navegadores)
- ⚠️ **DEVE abrir o app da tela inicial** pelo menos uma vez
- ✅ Notificações aparecem mesmo com app fechado (após configurar)

## 🎯 Teste Completo

1. **Configurar no celular:**
   - Android: Abrir Chrome, permitir notificações
   - iOS: Adicionar à tela inicial, abrir app, permitir notificações

2. **Verificar Service Worker:**
   - DevTools > Application > Service Workers > "activated"

3. **Fechar completamente:**
   - Android: Fechar todas as abas do Chrome
   - iOS: Fechar o app (swipe up)

4. **Aguardar 5 minutos**

5. **Enviar notificação:**
   - Via painel admin ou aguardar cron job

6. **Verificar:**
   - Notificação deve aparecer na barra de notificações
   - Mesmo com app/navegador completamente fechado

## ✅ Conclusão

**SIM, funciona no celular com app fechado!**

- **Android:** Funciona automaticamente no Chrome
- **iOS:** Funciona no Safari após adicionar à tela inicial (PWA)

Se não estiver funcionando, verifique os itens do checklist acima.

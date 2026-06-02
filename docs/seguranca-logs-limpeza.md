# 🔒 Limpeza de Logs - Segurança

## ✅ Correções Implementadas

### 1. **Função Helper para Mascarar Dados Sensíveis**
- Criada função `maskSensitiveData()` em `src/lib/logger.ts`
- Mascara automaticamente:
  - Chaves VAPID (mostra apenas 8 primeiros + 4 últimos caracteres)
  - Secrets/Tokens (mostra apenas 4 primeiros + 4 últimos caracteres)
  - Emails (mascara parte local, mantém domínio)
  - Chaves longas (p256dh, auth, etc.)

### 2. **Logs Corrigidos - Chaves e Secrets**

#### `src/app/api/push/check-reminders/route.ts`
- ❌ **Antes:** Logava valores de secrets parciais
- ✅ **Agora:** Apenas indica se existe, não mostra valor

#### `src/lib/webPush.ts`
- ❌ **Antes:** Logava que VAPID keys estavam configuradas
- ✅ **Agora:** Loga apenas status, não valores

#### `src/hooks/usePushNotifications.ts`
- ❌ **Antes:** Logava chave VAPID parcial (20 primeiros chars)
- ✅ **Agora:** Loga apenas tamanho e prefixo mascarado (8 chars)

#### `src/scripts/verify-vapid-key.ts`
- ❌ **Antes:** Logava 20 primeiros caracteres de chaves públicas e privadas
- ✅ **Agora:** Loga apenas 8 primeiros + 4 últimos caracteres

#### `src/scripts/generate-vapid-keys.ts`
- ⚠️ **Mantido:** Ainda mostra chaves completas (necessário para copiar ao .env)
- ✅ **Adicionado:** Avisos de segurança mais claros

#### `src/scripts/test-check-reminders.ts`
- ❌ **Antes:** Mostrava URL completa com secret
- ✅ **Agora:** Mascara secret na URL (mostra `***`)

#### `src/scripts/run-check-reminders-local.ts`
- ❌ **Antes:** Mostrava URL completa com secret
- ✅ **Agora:** Mascara secret na URL (mostra `***`)

#### `src/scripts/diagnose-nextjs.ts`
- ❌ **Antes:** Indicava se secret estava configurado
- ✅ **Agora:** Indica se está configurado mas não mostra valor

### 3. **Logs Corrigidos - Emails**

#### `src/app/api/push/reminders/route.ts`
- ❌ **Antes:** `console.log('Email:', session.user.email)`
- ✅ **Agora:** `console.log('Usuário autenticado:', session.user.id)`

#### `src/app/api/push/subscribe/route.ts`
- ❌ **Antes:** Logava email completo
- ✅ **Agora:** Loga apenas userId

#### `src/app/api/user/notifications-preference/route.ts`
- ❌ **Antes:** Logava email na sessão
- ✅ **Agora:** Loga apenas userId

#### `src/app/api/admin/users/route.ts`
- ❌ **Antes:** `console.log('Processando usuário:', user.email)`
- ✅ **Agora:** `console.log('Processando usuário:', user.id)`

#### `src/app/api/admin/users/[id]/route.ts`
- ❌ **Antes:** Logava emails de admin e usuário
- ✅ **Agora:** Loga apenas IDs

#### `src/app/api/admin/plans/route.ts`
- ❌ **Antes:** Logava email do admin
- ✅ **Agora:** Loga apenas ID do admin

#### `src/app/api/admin/plans/names/route.ts`
- ❌ **Antes:** Logava email do admin
- ✅ **Agora:** Loga apenas ID do admin

#### `src/middleware.ts`
- ❌ **Antes:** `console.log('Usuário autenticado:', token.email)`
- ✅ **Agora:** `console.log('Usuário autenticado, domínio:', @domain)`

#### `src/app/api/push/check-reminders/route.ts`
- ❌ **Antes:** Logava email completo
- ✅ **Agora:** Loga apenas domínio do email

### 4. **Logs Corrigidos - Endpoints e Chaves de Subscription**

#### `src/app/api/push/subscribe/route.ts`
- ❌ **Antes:** Logava endpoint completo (50 primeiros chars)
- ✅ **Agora:** Loga apenas 20 primeiros chars + tamanho total
- ❌ **Antes:** Logava chaves p256dh e auth
- ✅ **Agora:** Apenas indica se existem, não mostra valores

## 📋 Padrões de Segurança Aplicados

### ✅ O que é seguro logar:
- IDs de usuário (UUIDs)
- Status de configuração (true/false)
- Tamanhos de strings
- Prefixos mascarados (8 chars + "...")
- Domínios de email (sem parte local)

### ❌ O que NÃO deve ser logado:
- Chaves VAPID completas ou parciais significativas
- Secrets/Tokens completos
- Emails completos
- Passwords (mesmo hasheadas em logs)
- Endpoints completos de subscription
- Chaves p256dh e auth completas

## 🔧 Como Usar a Função de Mascaramento

```typescript
import { maskSensitiveData } from '@/lib/logger'

// Mascarar objeto
const data = {
  email: 'user@example.com',
  secret: 'my-secret-key-12345',
  vapidKey: 'BKbh9VRNKi0BVSgHLK8O...'
}

const masked = maskSensitiveData(data)
// Resultado:
// {
//   email: 'us***@example.com',
//   secret: 'my-s***2345',
//   vapidKey: 'BKbh9VR...K8O'
// }
```

## 🚨 Checklist de Segurança

- [x] Chaves VAPID mascaradas em logs
- [x] Secrets mascarados em logs
- [x] Emails mascarados ou removidos de logs
- [x] Tokens não logados
- [x] Endpoints de subscription mascarados
- [x] Chaves p256dh e auth não logadas
- [x] URLs com secrets mascaradas
- [x] Função helper criada para mascaramento automático

## 📝 Notas Importantes

1. **Script `generate-vapid-keys.ts`**: Ainda mostra chaves completas porque é necessário copiar para o `.env`. Isso é aceitável pois é um script local.

2. **Logs de desenvolvimento**: Alguns logs ainda aparecem em desenvolvimento, mas são mascarados automaticamente.

3. **Produção**: Todos os logs sensíveis são mascarados ou removidos automaticamente em produção.

## 🔍 Como Verificar

Execute o diagnóstico:
```bash
npm run diagnose-nextjs
```

Isso verifica se as variáveis estão configuradas sem expor valores.

---

**Última atualização:** Janeiro 2026
**Status:** ✅ Todas as correções aplicadas




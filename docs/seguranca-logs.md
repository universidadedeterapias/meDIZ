# Segurança de Logs - Configuração

## ✅ Correções Implementadas

### 1. **Logger Seguro Criado** (`src/lib/logger.ts`)
- Desativa logs de debug/info em produção
- Reda automaticamente PII (emails, IDs numéricos longos)
- Mantém apenas `error` logs (com redação de PII)

### 2. **NextAuth Debug**
- ✅ **Já configurado**: `debug: process.env.NODE_ENV === 'development'`
- ✅ **Eventos de debug**: Apenas em desenvolvimento (não expõem emails)
- ✅ **Logs de configuração**: Apenas em desenvolvimento

### 3. **Logs Corrigidos**
- ✅ `src/lib/pdfGenerator.ts` - Usa logger seguro
- ✅ `src/app/chat/result.tsx` - Removidos logs de conteúdo
- ✅ `src/components/nav-folders.tsx` - Logs apenas em dev
- ✅ `src/app/api/folders/*` - Removidos logs com dados sensíveis
- ✅ `src/app/api/plataforma-pagamento/route.ts` - Usa logger seguro, remove emails dos logs
- ✅ `src/app/admin/users/page.tsx` - Remove emails de logs
- ✅ `src/auth.ts` - Remove emails de eventos, logs apenas em dev

## 📋 Como Garantir que NextAuth Debug Está Desativado em Produção

### 1. **Verificar Variáveis de Ambiente na Vercel**

No painel da Vercel, verifique:

```
NODE_ENV=production  ✅ (deve estar como "production")
```

**Como verificar:**
1. Vá em **Settings → Environment Variables**
2. Verifique que `NODE_ENV` está definido como `production`

**Se não estiver:**
- Adicione: `NODE_ENV` = `production`
- Ou deixe a Vercel definir automaticamente (ela faz isso por padrão em deployments)

### 2. **Verificar no Código**

O NextAuth já está configurado para desativar debug automaticamente:

```typescript:src/auth.ts
// ✅ Esta linha já garante debug apenas em dev
debug: process.env.NODE_ENV === 'development',

// ✅ Eventos também só em dev
events: process.env.NODE_ENV === 'development' ? { ... } : {},
```

### 3. **Testar em Produção**

Para garantir que está desativado:

1. **Deploy na Vercel**
2. **Acesse os logs do deployment** (Vercel Dashboard → Deployment → Functions Logs)
3. **Faça login na aplicação em produção**
4. **Verifique os logs**: Não deve aparecer:
   - ❌ `[NextAuth] SignIn event:` com emails
   - ❌ `[NextAuth] Session event:` com emails/tokens
   - ❌ `[auth][warn][debug-enabled]`

**Se ainda aparecer**:
- Verifique se `NODE_ENV=production` está definido
- Verifique se não há variável `AUTH_DEBUG` ou `NEXTAUTH_DEBUG` definida como `true`

### 4. **Variáveis de Ambiente Recomendadas na Vercel**

Certifique-se de ter estas variáveis configuradas:

```
NODE_ENV=production
NEXTAUTH_SECRET=<seu-secret>
NEXTAUTH_URL=https://seu-dominio.com
```

**⚠️ NÃO configure:**
```
AUTH_DEBUG=true  ❌ (não configure isso em produção!)
NEXTAUTH_DEBUG=true  ❌ (não configure isso em produção!)
```

## 🔒 Boas Práticas

1. **Nunca logar PII em produção**:
   - Emails
   - Nomes completos
   - IDs de usuário
   - Tokens/Sessions
   - Dados de pagamento

2. **Use o logger seguro**:
   ```typescript
   import { logger } from '@/lib/logger'
   
   logger.debug('Info apenas em dev')  // Não aparece em prod
   logger.error('Erro sempre logado')  // Aparece, mas com PII redacted
   ```

3. **Logs condicionais**:
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     console.log('Debug info')
   }
   ```

## 🚨 Logs que Ainda Podem Apararecer (Normais)

Estes são seguros e devem aparecer:
- ✅ `console.error()` para erros críticos (mas devem usar logger.error que reda PII)
- ✅ Logs de sistema (servidor, banco)
- ✅ Métricas/analytics (sem PII)

## 📝 Checklist de Segurança

- [x] Logger seguro criado e implementado
- [x] NextAuth debug desativado em produção
- [x] Emails removidos de logs de eventos
- [x] Logs de conteúdo sensível removidos
- [x] Logs de admin protegidos
- [x] Webhook PlataformaPagamento usa logger seguro
- [ ] Verificar `NODE_ENV=production` na Vercel
- [ ] Testar logs em produção após deploy
- [ ] Remover variáveis `AUTH_DEBUG` se existirem


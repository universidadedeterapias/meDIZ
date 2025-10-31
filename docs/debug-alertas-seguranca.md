# 🔍 Debug: Alertas de Segurança - Guia de Diagnóstico

## ✅ Correções Aplicadas

### Problema 1: Formatação Dupla de Mensagem
**Problema:** A função `sendSecurityAlert` estava recebendo uma mensagem já formatada, causando formatação dupla.

**Solução:** Alterado para usar `sendWhatsAppText` diretamente, já que a mensagem já está formatada.

**Arquivo corrigido:** `src/lib/security/injection-alert-service.ts`

### Problema 2: Importações
**Status:** ✅ Todas as importações estão corretas

---

## 🧪 Como Testar

### Teste 1: Teste Manual de Detecção

```bash
# Executar script de teste
tsx scripts/test-injection-alerts.ts
```

Este script testa:
- ✅ Detecção de SQL Injection
- ✅ Detecção de Command Injection
- ✅ Valores seguros (sem falsos positivos)
- ✅ Processamento de alertas

### Teste 2: Teste Real via API

```bash
# Teste SQL Injection no endpoint /api/user/form
curl -X POST http://localhost:3000/api/user/form \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=SEU_TOKEN_AQUI" \
  -d '{"fullName": "'; DROP TABLE users; --", "age": 30}'

# Esperado: 403 Forbidden + Alerta enviado
```

### Teste 3: Verificar Logs do Servidor

Procure por logs como:
```
[SecurityMiddleware] 🚨 INJEÇÃO DETECTADA
[InjectionAlert] Tentativa de SQL_INJECTION detectada e processada
[InjectionAlert] Alerta enviado para admin@mediz.com
```

---

## 🔍 Checklist de Verificação

### 1. Banco de Dados
- [ ] Tabela `injection_attempts` existe
- [ ] Migration executada: `npx prisma migrate dev`
- [ ] Prisma Client gerado: `npx prisma generate`

### 2. Variáveis de Ambiente (WhatsApp)
- [ ] `ZAPI_BASE_URL` configurado
- [ ] `ZAPI_INSTANCE_ID` configurado
- [ ] `ZAPI_TOKEN` configurado
- [ ] `ZAPI_CLIENT_TOKEN` configurado (opcional)

**Como verificar:**
```bash
node -e "console.log('ZAPI_BASE_URL:', process.env.ZAPI_BASE_URL)"
```

### 3. Admins com WhatsApp
- [ ] Existe pelo menos 1 admin com email `@mediz.com`
- [ ] Admin tem campo `whatsapp` preenchido no banco

**Query para verificar:**
```sql
SELECT email, whatsapp FROM users WHERE email LIKE '%@mediz.com' AND whatsapp IS NOT NULL;
```

### 4. Sistema de Detecção
- [ ] Middleware está ativo (verificar `src/middleware.ts`)
- [ ] Helper está sendo usado nas rotas (verificar `/api/user/form`)
- [ ] Biblioteca de detecção está funcionando

### 5. Logs e Monitoramento
- [ ] Logs aparecem no console quando detecção ocorre
- [ ] Registros são salvos no banco (`injection_attempts`)
- [ ] Alertas aparecem no painel admin (`/admin/injection-attempts`)

---

## 🐛 Problemas Comuns e Soluções

### Problema: Alertas não estão sendo enviados

**Possíveis causas:**

1. **WhatsApp não configurado**
   - Verifique variáveis de ambiente
   - No modo desenvolvimento, alertas são simulados (ver console)

2. **Nenhum admin com WhatsApp**
   - Verifique no banco de dados
   - Adicione WhatsApp a um admin

3. **Erro silencioso**
   - Verifique logs do servidor
   - Procure por `[InjectionAlert] Erro`

**Como diagnosticar:**
```bash
# Ver logs em tempo real
npm run dev | grep -i "injectionalert\|securitymiddleware"
```

### Problema: Detecção não está funcionando

**Possíveis causas:**

1. **Middleware não está executando**
   - Verifique `src/middleware.ts` linha 11-16
   - Verifique se rota começa com `/api/`

2. **Padrões muito restritivos**
   - Verifique `src/lib/security/injection-detector.ts`
   - Teste com payload conhecido

3. **Whitelist muito permissiva**
   - Verifique função `isSafeValue`

**Como diagnosticar:**
```typescript
// Adicionar log temporário no middleware
console.log('[DEBUG] Analisando:', { endpoint, hasQuery: !!queryParams })
```

### Problema: Falsos Positivos

**Solução:**
- Ajuste padrões em `injection-detector.ts`
- Adicione padrões à whitelist em `SAFE_PATTERNS`

---

## 📊 Verificação de Fluxo Completo

### Fluxo Esperado:

```
1. Requisição maliciosa chega
   ↓
2. Middleware intercepta (/api/*)
   ↓
3. Detecção executa (injection-detector.ts)
   ↓
4. Se detectado:
   a. Registra no banco (injection_attempts)
   b. Formata mensagem de alerta
   c. Busca admins com WhatsApp
   d. Envia alerta para cada admin
   e. Atualiza registro (alertSent = true)
   f. Registra no audit log
   ↓
5. Bloqueia requisição (403)
```

### Verificações em Cada Etapa:

**Etapa 1-2:** Verificar logs do middleware
```bash
[SecurityMiddleware] Analisando requisição...
```

**Etapa 3:** Verificar detecção
```bash
[SecurityMiddleware] 🚨 INJEÇÃO DETECTADA: { type: 'SQL_INJECTION' }
```

**Etapa 4a:** Verificar banco
```sql
SELECT * FROM injection_attempts ORDER BY created_at DESC LIMIT 1;
```

**Etapa 4b-d:** Verificar envio
```bash
[InjectionAlert] Alerta enviado para admin@mediz.com
```

**Etapa 4e:** Verificar atualização
```sql
SELECT alert_sent FROM injection_attempts WHERE id = '...';
-- Deve ser true
```

**Etapa 5:** Verificar resposta HTTP
```bash
Status: 403 Forbidden
Body: { "error": "Requisição bloqueada por segurança" }
```

---

## 🛠️ Ferramentas de Debug

### Script de Teste Automático
```bash
tsx scripts/test-injection-alerts.ts
```

### Verificar Status do Sistema
```sql
-- Ver últimas tentativas
SELECT * FROM injection_attempts ORDER BY created_at DESC LIMIT 10;

-- Ver estatísticas
SELECT 
  type,
  severity,
  COUNT(*) as total,
  SUM(CASE WHEN alert_sent THEN 1 ELSE 0 END) as alerts_sent
FROM injection_attempts
GROUP BY type, severity;
```

### Logs do Servidor
```bash
# Filtrar apenas logs de segurança
npm run dev 2>&1 | grep -E "\[SecurityMiddleware\]|\[InjectionAlert\]"
```

---

## ✅ Checklist Final

Antes de considerar que está funcionando:

- [ ] Script de teste passa em todos os casos
- [ ] Requisição maliciosa retorna 403
- [ ] Registro aparece no banco (`injection_attempts`)
- [ ] Alerta é enviado (ver logs ou WhatsApp)
- [ ] Registro mostra `alertSent = true`
- [ ] Audit log contém entrada
- [ ] Painel admin mostra tentativa (`/admin/injection-attempts`)

---

## 📞 Suporte

Se após todas as verificações ainda não funcionar:

1. Verifique logs completos do servidor
2. Verifique se todas as dependências estão instaladas
3. Execute `npx prisma generate` novamente
4. Verifique se o banco está acessível
5. Teste envio manual de WhatsApp via `/admin/security-alerts`

---

**Última atualização:** Janeiro 2025  
**Versão:** 1.0


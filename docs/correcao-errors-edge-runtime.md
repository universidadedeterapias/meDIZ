# 🔧 Correção: Erros no Edge Runtime

## ❌ Problemas Identificados

### 1. PrismaClient no Edge Runtime
**Erro:** `PrismaClient is unable to run in this browser environment, or has been bundled for the browser`

**Causa:** O middleware (`middleware-security.ts`) estava tentando usar `processInjectionDetection` que importa Prisma, mas middleware no Next.js roda no **Edge Runtime** que não suporta Prisma.

### 2. ClientFetchError - HTML em vez de JSON
**Erro:** `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**Causa:** Provavelmente relacionado ao primeiro erro - quando o middleware falhava, retornava página de erro HTML.

---

## ✅ Soluções Aplicadas

### Solução 1: API Route Separada para Processamento

Criada nova rota `/api/security/log-injection` que:
- ✅ Roda no **Node.js runtime** (não Edge)
- ✅ Pode usar Prisma sem problemas
- ✅ Processa alertas de forma assíncrona

**Arquivo criado:** `src/app/api/security/log-injection/route.ts`

### Solução 2: Middleware Atualizado

O middleware agora:
- ✅ Apenas detecta injeções (sem Prisma)
- ✅ Envia dados para API route via `fetch` assíncrono
- ✅ Não bloqueia a resposta 403
- ✅ Falha silenciosamente se alerta não enviar

**Arquivo modificado:** `src/middleware-security.ts`

---

## 🔄 Novo Fluxo

### Antes (❌ Quebrado):
```
Middleware (Edge Runtime)
  ↓
processInjectionDetection()
  ↓
Prisma (❌ NÃO FUNCIONA no Edge)
```

### Depois (✅ Funcionando):
```
Middleware (Edge Runtime)
  ↓
Detecta injeção (apenas análise, sem Prisma)
  ↓
fetch('/api/security/log-injection') - Assíncrono
  ↓
API Route (Node.js Runtime)
  ↓
processInjectionDetection()
  ↓
Prisma (✅ FUNCIONA no Node.js)
```

---

## 📝 Mudanças nos Arquivos

### 1. `src/middleware-security.ts`
**Removido:**
- Import de `processInjectionDetection`
- Import de `auth`
- Chamada direta a `processInjectionDetection`

**Adicionado:**
- Chamada assíncrona via `fetch` para `/api/security/log-injection`
- Extração de IP e User-Agent antes do fetch

### 2. `src/app/api/security/log-injection/route.ts` (NOVO)
**Funcionalidades:**
- Recebe dados da detecção
- Processa alerta usando Prisma
- Retorna resultado

**Runtime:** `nodejs` (forçado via `export const runtime = 'nodejs'`)

---

## 🧪 Como Testar

### Teste 1: Verificar se Erro foi Corrigido

```bash
# Reiniciar servidor
npm run dev

# Testar requisição maliciosa
curl -X POST http://localhost:3000/api/user/form \
  -H "Content-Type: application/json" \
  -d '{"fullName": "'; DROP TABLE users; --"}'

# Esperado: 403 Forbidden (JSON) - SEM erro de Prisma
```

### Teste 2: Verificar Logs

Procure por:
```
[SecurityMiddleware] 🚨 INJEÇÃO DETECTADA: { type: 'SQL_INJECTION', ... }
[LogInjection API] Processando alerta...
[InjectionAlert] Alerta enviado para admin@mediz.com
```

### Teste 3: Verificar Banco de Dados

```sql
SELECT * FROM injection_attempts ORDER BY created_at DESC LIMIT 1;
-- Deve ter registro com alertSent = true/false
```

---

## ⚠️ Notas Importantes

### Fetch Assíncrono no Middleware

O `fetch` no middleware é **não-bloqueante**:
- Requisição é bloqueada imediatamente (403)
- Alerta é processado em background
- Se alerta falhar, requisição já foi bloqueada

### Performance

- ✅ Middleware continua rápido (sem Prisma)
- ✅ Alerta processado em background
- ✅ Não impacta tempo de resposta

### Fallback

Se a API `/api/security/log-injection` não responder:
- Requisição continua bloqueada (403)
- Log de erro no console
- Sistema continua funcionando

---

## ✅ Checklist de Verificação

Após aplicar correções:

- [ ] Servidor inicia sem erros
- [ ] Requisição maliciosa retorna 403 (JSON)
- [ ] Sem erros de Prisma no console
- [ ] Logs mostram detecção e alerta
- [ ] Registro aparece no banco
- [ ] Alerta enviado (se WhatsApp configurado)

---

## 🔍 Troubleshooting

### Erro persiste: "PrismaClient is unable to run"

**Solução:** Verifique se não há outros imports de Prisma no middleware:
```bash
grep -r "prisma\|Prisma" src/middleware*.ts
```

### Alerta não está sendo processado

**Verificar:**
1. API route existe: `/api/security/log-injection`
2. Runtime está configurado: `export const runtime = 'nodejs'`
3. Logs mostram chamada à API

**Teste manual:**
```bash
curl -X POST http://localhost:3000/api/security/log-injection \
  -H "Content-Type: application/json" \
  -d '{"detection": {...}, "endpoint": "/api/test", "method": "POST"}'
```

---

**Última atualização:** Janeiro 2025  
**Status:** ✅ Corrigido


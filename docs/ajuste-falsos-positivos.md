# 🔧 Ajuste de Falsos Positivos - Guia Rápido

## ⚠️ Problema

Se requisições legítimas estão sendo bloqueadas, você pode:

### Opção 1: Modo Log-Only (Temporário)

Ative o modo que apenas **logga** sem bloquear:

**1. Adicione ao `.env.local`:**
```bash
SECURITY_LOG_ONLY=true
```

**2. Reinicie o servidor:**
```bash
npm run dev
```

**3. Use o sistema normalmente e verifique logs:**
```bash
# Procure por:
[SecurityMiddleware] ⚠️  MODO LOG-ONLY: Detectado mas NÃO bloqueado
```

**4. Após alguns dias, identifique padrões e ajuste**

**5. Desative o modo:**
```bash
# Remova SECURITY_LOG_ONLY do .env.local ou defina como false
SECURITY_LOG_ONLY=false
```

### Opção 2: Verificar o que foi Detectado

**Acesse o painel admin:**
```
/admin/injection-attempts
```

**Veja:**
- Qual padrão foi detectado
- Qual campo tinha o valor
- Qual era o valor exato

### Opção 3: Adicionar à Whitelist

Se encontrar um padrão legítimo que está sendo bloqueado:

**1. Edite `src/lib/security/injection-detector.ts`**

**2. Adicione à lista `SAFE_PATTERNS`:**
```typescript
const SAFE_PATTERNS = [
  // ... padrões existentes
  /^SEU_PADRAO_AQUI$/, // Novo padrão seguro
]
```

**3. Ou adicione campo seguro:**
```typescript
const SAFE_FIELDS = [
  // ... campos existentes
  'seuCampoSeguro', // Novo campo seguro
]
```

---

## 📊 Padrões Ajustados Recentemente

Os seguintes padrões foram tornados **mais específicos** para reduzir falsos positivos:

1. ✅ Command Chaining - agora precisa ser `;;` ou `;rm`, não apenas `;`
2. ✅ SQL Comment - agora precisa estar isolado ou no início/fim
3. ✅ Information Function - precisa ter espaço antes
4. ✅ Environment Variable - formato mais específico

---

## 🧪 Teste de Validação

Teste com valores legítimos comuns:

```bash
# Não deve bloquear:
- "João Silva (Filho)"
- "Texto com #hashtag"
- "user(name)"
- "valor$123"
- "https://example.com"
- "(11) 99999-9999"
```

---

**Última atualização:** Janeiro 2025


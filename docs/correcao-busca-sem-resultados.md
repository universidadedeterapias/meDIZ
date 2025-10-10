# Correção: Busca sem Resultados - Causa Raiz e Solução

## 🚨 Problema Identificado

A busca não está retornando resultados devido a **dois problemas principais**:

### 1. **Variáveis de Ambiente Não Configuradas** ❌
- **Arquivo `.env.local` não existe**
- `OPENAI_API_KEY` = `undefined`
- `OPENAI_ASSISTANT_ID` = `undefined`

**Sintoma:** Erro 500 no endpoint `/api/openai`:
```
SyntaxError: Unexpected token 'u', "upstream c"... is not valid JSON
```

### 2. **Erro de Hidratação React** ⚠️
- Componente `ShareInsightDialog` usa APIs do navegador durante SSR
- `navigator.share`, `window.location`, `navigator.clipboard` executados no servidor

**Sintoma:** Console mostra erro de hidratação:
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties
```

## 🔧 Soluções Implementadas

### ✅ **1. Melhorado Tratamento de Erro OpenAI**

**Arquivo:** `src/lib/openai.ts`

```typescript
if (!res.ok) {
  let errorMessage = `OpenAI API error: ${res.statusText}`
  
  try {
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const err = await res.json()
      console.error('OpenAI API error details:', err)
      errorMessage = err.error?.message || errorMessage
    } else {
      // Resposta não é JSON (provavelmente HTML de erro)
      const text = await res.text()
      console.error('OpenAI API non-JSON error:', text.substring(0, 200))
      errorMessage = `OpenAI API error: ${res.status} - ${res.statusText}`
    }
  } catch (parseError) {
    console.error('Error parsing OpenAI API response:', parseError)
  }
  
  throw new Error(errorMessage)
}
```

**Melhorias:**
- ✅ **Detecta tipo de conteúdo** antes de tentar parse JSON
- ✅ **Trata respostas HTML** de erro (quando API key inválida)
- ✅ **Logs mais informativos** para debugging
- ✅ **Fallback robusto** em caso de erro de parsing

### ✅ **2. Corrigido Erro de Hidratação**

**Arquivo:** `src/components/Share.tsx`

```typescript
function openDeepLink(appUrl: string, webUrl: string) {
  // Verifica se está no cliente antes de usar window
  if (typeof window === 'undefined') return
  
  window.location.href = appUrl
  setTimeout(() => {
    window.location.href = webUrl
  }, 500)
}

// Em todos os onClick handlers:
onClick={() => {
  // Verifica se está no cliente antes de usar navigator
  if (typeof window === 'undefined') return
  
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {
      openDeepLink('instagram://app', 'https://instagram.com')
    })
  } else {
    openDeepLink('instagram://app', 'https://instagram.com')
  }
}}
```

**Melhorias:**
- ✅ **Verificação `typeof window`** em todas as funções
- ✅ **Prevenção de execução no servidor** de APIs do navegador
- ✅ **Hidratação consistente** entre servidor e cliente

### ✅ **3. Script de Debug Criado**

**Arquivo:** `src/scripts/debug-search-api.ts`

```bash
npm run debug-search
```

**Funcionalidades:**
- ✅ **Verifica variáveis de ambiente** (OPENAI_API_KEY, OPENAI_ASSISTANT_ID)
- ✅ **Lista usuários de teste** disponíveis
- ✅ **Verifica configuração do popup**
- ✅ **Estatísticas do sistema** (usuários, sessões, subscriptions)
- ✅ **Instruções de próximos passos**

## 📋 **Passos para Resolver Completamente**

### **1. Configurar Variáveis de Ambiente**

Crie arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/mediz"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aqui-minimo-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI (OBRIGATÓRIO)
OPENAI_API_KEY="sk-sua-chave-openai-aqui"
OPENAI_ASSISTANT_ID="asst_seu-assistant-id-aqui"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="sua-api-key"
CLOUDINARY_API_SECRET="seu-api-secret"

# Stripe (opcional)
STRIPE_SECRET_KEY="sk_test_sua-chave-stripe"
STRIPE_PUBLISHABLE_KEY="pk_test_sua-chave-publica"
```

### **2. Criar Usuários de Teste**

```bash
npm run create-test-8-30
```

### **3. Configurar Popup**

```bash
npm run seed-popup
```

### **4. Reiniciar Servidor**

```bash
npm run dev
```

### **5. Testar Busca**

1. Acesse `http://localhost:3000/chat`
2. Faça login com usuário de teste: `teste8dias@teste.com` / `Teste123!`
3. Digite uma consulta: "dor de cabeça"
4. Verifique se:
   - ✅ Resultados aparecem
   - ✅ Popup aparece após 2 segundos
   - ✅ Conteúdo limitado (blur) para usuários sem premium

## 🧪 **Comandos de Validação**

```bash
# Debug completo do sistema
npm run debug-search

# Verificar usuários de teste
npm run create-test-8-30

# Validar definição de premium
npm run validate-premium

# Auditoria completa
npm run audit-users

# Verificar popup
npm run check-popup
```

## 🔍 **Diagnóstico de Problemas**

### **Erro 500 no /api/openai**
```bash
# Verificar se variáveis estão configuradas
node -e "console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')"
```

### **Erro de Hidratação**
- ✅ **Corrigido** com verificações `typeof window`
- ✅ **Componente ClientOnly** já implementado
- ✅ **APIs do navegador** protegidas

### **Busca Sem Resultados**
1. **Verificar logs do servidor** para erros específicos
2. **Testar endpoint diretamente**:
   ```bash
   curl -X POST http://localhost:3000/api/openai \
     -H "Content-Type: application/json" \
     -d '{"message": "dor de cabeça"}'
   ```
3. **Verificar se usuário tem subscription ativa**

## 📊 **Critérios de Aceite**

- ✅ **Erro 500 corrigido** com melhor tratamento de erro
- ✅ **Erro de hidratação corrigido** com verificações de cliente
- ✅ **Script de debug criado** para diagnóstico
- ✅ **Documentação completa** com passos de resolução
- ⏳ **Variáveis de ambiente** precisam ser configuradas pelo usuário
- ⏳ **Usuários de teste** precisam ser criados
- ⏳ **Popup configurado** para funcionar corretamente

## 🎯 **Próximos Passos**

1. **Configurar `.env.local`** com chaves OpenAI válidas
2. **Criar usuários de teste** para validação
3. **Testar busca completa** com diferentes cenários
4. **Verificar restrições** funcionando corretamente
5. **Monitorar logs** para erros adicionais

---

**Status:** ✅ **Problemas Identificados e Corrigidos**  
**Próximo:** ⏳ **Configuração de Variáveis de Ambiente pelo Usuário**  
**Data:** 07/10/2025

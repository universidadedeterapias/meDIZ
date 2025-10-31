# 🔧 Correção de Erros 504 (Timeout) em Produção

## 📋 Problema Identificado

**Erro:** `FUNCTION_INVOCATION_TIMEOUT` - Erro 504 em produção  
**Causa:** Conflito entre timeout do código e timeout do Vercel

### Análise do Problema

1. **Timeout do Vercel:** Configurado para 30 segundos (`vercel.json`)
2. **Timeout do código:** `waitForRunCompletion` podia demorar até 60 segundos
3. **Consequência:** Vercel cancelava a função antes do código terminar → Erro 504

---

## ✅ Correções Implementadas

### 1. **Aumento do Timeout no Vercel**

**Arquivo:** `vercel.json`

**Mudança:**
- Endpoint `/api/openai` agora tem timeout de **300 segundos (5 minutos)**
- Outras APIs: **60 segundos**

```json
{
  "functions": {
    "src/app/api/openai/route.ts": {
      "maxDuration": 300  // 5 minutos para OpenAI
    },
    "src/app/api/**/*.ts": {
      "maxDuration": 60  // 1 minuto para outras APIs
    }
  }
}
```

**Benefício:** Dá tempo suficiente para o Assistants API processar consultas complexas.

---

### 2. **Configuração de Timeout no Next.js 15**

**Arquivo:** `src/app/api/openai/route.ts`

**Adicionado:**
```typescript
export const maxDuration = 300 // 5 minutos
export const runtime = 'nodejs' // Garante uso do runtime Node.js
```

**Benefício:** Next.js 15 reconhece e respeita o timeout configurado.

---

### 3. **Aumento do Timeout de Polling**

**Arquivo:** `src/lib/assistant.ts`

**Mudança:**
- **Antes:** 60 tentativas (60 segundos máximo)
- **Depois:** 240 tentativas (4 minutos máximo)

**Polling adaptativo:**
- Primeiros 10 tentativas: 500ms (5 segundos)
- Próximas 50 tentativas: 1000ms (50 segundos)
- Restante: 2000ms (3 minutos 40 segundos)

**Benefício:** Dá mais tempo para a OpenAI processar consultas complexas, com polling eficiente.

---

### 4. **Melhorias no Tratamento de Erros**

**Arquivo:** `src/app/api/openai/route.ts`

**Melhorias:**
- ✅ Detecção específica de timeouts
- ✅ Logs detalhados de performance
- ✅ Mensagens de erro mais informativas
- ✅ Retorno de status 504 específico para timeout

**Exemplo de log:**
```
[API OpenAI] 🚀 Iniciando processamento para usuário abc123
[API OpenAI] ✅ Thread criada em 234ms: thread_abc
[API OpenAI] 🔄 Run iniciado em 456ms: run_xyz
[API OpenAI] ✅ Run completado em 45234ms
[API OpenAI] 📨 Mensagens obtidas em 123ms
[API OpenAI] ✅ Processamento completo em 46023ms
```

---

### 5. **Melhorias no Frontend**

**Arquivo:** `src/app/chat/page.tsx`

**Melhorias:**
- ✅ Detecção específica de erro 504
- ✅ Mensagens de erro amigáveis e acionáveis
- ✅ Tratamento diferenciado para diferentes tipos de erro
- ✅ Redirecionamento automático em caso de erro de autenticação

**Mensagens de erro:**
- **Timeout (504):** "A consulta está demorando... tente reformular a pergunta"
- **Network:** "Erro de conexão... verifique sua internet"
- **Auth (401):** "Você precisa fazer login novamente" + redirecionamento

---

## 📊 Comparação: Antes vs. Depois

### Antes
- ❌ Timeout Vercel: 30s
- ❌ Timeout código: 60s
- ❌ **Conflito:** Função cancelada antes de terminar
- ❌ Erro genérico: "FUNCTION_INVOCATION_TIMEOUT"
- ❌ Sem logs de performance

### Depois
- ✅ Timeout Vercel: 300s (5 min)
- ✅ Timeout código: 240s (4 min)
- ✅ **Compatível:** Margem de 60s antes do timeout
- ✅ Erro específico: Mensagem clara sobre timeout
- ✅ Logs detalhados para debugging

---

## 🎯 Benefícios das Correções

### Para Usuários
- ✅ Consultas complexas não são mais interrompidas
- ✅ Mensagens de erro mais claras e acionáveis
- ✅ Melhor experiência quando há problemas

### Para Desenvolvimento
- ✅ Logs detalhados facilitam debugging
- ✅ Identificação rápida de gargalos
- ✅ Métricas de performance (tempo de cada etapa)

### Para Produção
- ✅ Menos erros 504
- ✅ Maior taxa de sucesso nas consultas
- ✅ Monitoramento melhor com logs estruturados

---

## 📝 Limitações e Considerações

### Plano do Vercel

**⚠️ IMPORTANTE:** Timeout de 300 segundos (5 minutos) requer plano **Pro** do Vercel.

**Planos Vercel:**
- **Hobby (Free):** Máximo 10 segundos
- **Pro:** Máximo 300 segundos (5 minutos) ✅
- **Enterprise:** Máximo 900 segundos (15 minutos)

**Se estiver no plano Hobby:**
- Atualize para Pro, ou
- Reduza o timeout para 10 segundos e otimize o código (não recomendado)

### Monitoramento

Recomendações:
1. **Monitorar logs** para identificar consultas que demoram muito
2. **Alertar** se mais de 50% das consultas demorarem > 2 minutos
3. **Otimizar** o Assistants API se necessário (modelo, instruções, etc.)

---

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Timeout no Vercel
```bash
# O arquivo vercel.json deve ter maxDuration: 300 para /api/openai
cat vercel.json
```

### 2. Testar Localmente
```bash
# Iniciar servidor
npm run dev

# Fazer uma consulta complexa
# Verificar logs no terminal
```

### 3. Verificar Logs em Produção
- Acesse Vercel Dashboard → Deployments → Functions
- Procure por logs com prefixo `[API OpenAI]` ou `[Assistant]`
- Verifique tempos de processamento

---

## 🚨 Troubleshooting

### Erro 504 ainda ocorre

**Possíveis causas:**
1. **Plano Hobby:** Upgrade necessário para Pro
2. **Timeout do código > 5 minutos:** Otimizar `waitForRunCompletion`
3. **Problema na OpenAI:** Verificar status da API

**Soluções:**
```typescript
// Se timeout ainda ocorrer, reduzir maxAttempts
const maxAttempts = 120 // 2 minutos (margem de segurança)
```

### Consultas muito lentas

**Otimizações possíveis:**
1. **Simplificar instruções do Assistants API**
2. **Usar modelo mais rápido** (ex: gpt-4-turbo ao invés de gpt-4)
3. **Implementar cache** para consultas similares
4. **Streaming de resposta** (processar enquanto gera)

---

## 📚 Referências

- [Vercel Function Duration Limits](https://vercel.com/docs/functions/runtimes/max-duration)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants)
- [Next.js 15 Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration)

---

**Última atualização:** Janeiro 2025  
**Status:** ✅ Implementado e testado


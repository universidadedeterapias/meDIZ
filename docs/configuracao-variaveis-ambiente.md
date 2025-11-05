# Variáveis de Ambiente - meDIZ

## Configuração Necessária

Para que a aplicação funcione corretamente, você precisa criar um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/mediz"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="seu-google-client-id"
GOOGLE_CLIENT_SECRET="seu-google-client-secret"

# OpenAI (OBRIGATÓRIO para busca funcionar)
OPENAI_API_KEY="sk-sua-chave-openai-aqui"
OPENAI_ASSISTANT_ID="asst_seu-assistant-id-aqui"

# Cloudinary (opcional - para uploads)
CLOUDINARY_CLOUD_NAME="seu-cloud-name"
CLOUDINARY_API_KEY="sua-api-key"
CLOUDINARY_API_SECRET="seu-api-secret"

# Stripe (opcional - para pagamentos)
STRIPE_SECRET_KEY="sk_test_sua-chave-stripe"
STRIPE_PUBLISHABLE_KEY="pk_test_sua-chave-publica"

# Hotmart (OBRIGATÓRIO para webhooks funcionarem)
# ⚠️ IMPORTANTE: Configure APENAS estas duas variáveis (NÃO use _V2)
HOTMART_MONTHLY_PRICE_CODE="seu-codigo-mensal-hotmart"
HOTMART_YEARLY_PRICE_CODE="seu-codigo-anual-hotmart"

# Opcionais: Nomes dos planos (se diferente do padrão)
HOTMART_MONTHLY_PLAN_NAME="Nome do Plano Mensal"
HOTMART_YEARLY_PLAN_NAME="Nome do Plano Anual"

# Opcionais: Valores em centavos (se quiser exibir preços)
HOTMART_MONTHLY_AMOUNT="9900"  # R$ 99,00
HOTMART_YEARLY_AMOUNT="99000"  # R$ 990,00

# Redis (RECOMENDADO para produção)
# Para rate limiting e bloqueio de IPs
REDIS_URL="redis://localhost:6379"  # Local
# Ou para produção (Upstash, Redis Cloud, etc):
# REDIS_URL="rediss://default:senha@host.upstash.io:6379"
```

## ⚠️ Problema Identificado

**Causa Raiz:** O arquivo `.env.local` não existe, resultando em:
- `OPENAI_API_KEY` = `undefined`
- `OPENAI_ASSISTANT_ID` = `undefined`

**Sintoma:** Erro 500 no endpoint `/api/openai` com:
```
SyntaxError: Unexpected token 'u', "upstream c"... is not valid JSON
```

**Explicação:** Quando a API key não está definida, a requisição para a OpenAI falha e retorna uma resposta HTML de erro (não JSON), causando o erro de parsing.

## 🔧 Solução

1. **Criar arquivo `.env.local`** na raiz do projeto
2. **Configurar `OPENAI_API_KEY`** com sua chave da OpenAI
3. **Configurar `OPENAI_ASSISTANT_ID`** com o ID do seu assistant
4. **Reiniciar o servidor** (`npm run dev`)

## 🧪 Como Testar

Após configurar as variáveis:

```bash
# Verificar se as variáveis estão carregadas
node -e "console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET')"

# Testar endpoint
curl -X POST http://localhost:3000/api/openai \
  -H "Content-Type: application/json" \
  -d '{"message": "teste"}'
```

## 📝 Notas Importantes

- **Nunca commite** o arquivo `.env.local` (já está no `.gitignore`)
- **Use chaves de teste** da OpenAI para desenvolvimento
- **O Assistant ID** deve ser criado no dashboard da OpenAI
- **Sem essas variáveis**, a funcionalidade de busca não funcionará

---

**Status:** ❌ **BLOQUEANTE** - Busca não funciona sem essas configurações

---

## 🔴 Variáveis Hotmart - ATENÇÃO

### ⚠️ Variáveis que NÃO devem existir:

**NÃO configure estas variáveis na Vercel:**
- ❌ `HOTMART_MONTHLY_PRICE_CODE_V2` 
- ❌ `HOTMART_YEARLY_PRICE_CODE_V2`

**Por quê?** Essas variáveis `_V2` não devem existir e não são usadas no código.

### ✅ Variáveis corretas:

**Configure APENAS estas variáveis na Vercel:**
- ✅ `HOTMART_MONTHLY_PRICE_CODE` - Um dos códigos dos planos mensais (ex: `price_1RcsjzA` ou `price_hotmart_mensal`)
- ✅ `HOTMART_YEARLY_PRICE_CODE` - Um dos códigos dos planos anuais (ex: `price_1Rd9st` ou `price_hotmart_anual`)

### 📋 Os 4 planos válidos no sistema:

**Mensais (2 planos):**
1. `price_hotmart_mensal` - Plano mensal legacy
2. `price_1RcsjzA` - Plano mensal alternativo

**Anuais (2 planos):**
3. `price_hotmart_anual` - Plano anual legacy
4. `price_1Rd9st` - Plano anual alternativo

**⚠️ IMPORTANTE:** Todos os 4 planos devem existir no banco de dados. O webhook tenta identificar o plano correto pelo `offer.code` do payload, que deve corresponder exatamente a um dos 4 códigos acima.

### 🔧 Como configurar na Vercel:

1. Vá em **Settings → Environment Variables**
2. **REMOVA** (se existirem):
   - `HOTMART_MONTHLY_PRICE_CODE_V2`
   - `HOTMART_YEARLY_PRICE_CODE_V2`
3. **CONFIGURE** apenas:
   - `HOTMART_MONTHLY_PRICE_CODE` = `price_1RcsjzA` (ou `price_hotmart_mensal`)
   - `HOTMART_YEARLY_PRICE_CODE` = `price_1Rd9st` (ou `price_hotmart_anual`)
4. **Redeploy** a aplicação

### 📝 Como o sistema identifica o plano:

1. **PRIORIDADE 1:** Busca pelo `offer.code` do payload (correspondência exata)
2. **PRIORIDADE 2:** Busca pela periodicidade (month/year) + códigos conhecidos
3. **PRIORIDADE 3:** Busca por intervalo e prioriza os 4 códigos conhecidos

**⚠️ O `offer.code` do webhook Hotmart deve corresponder EXATAMENTE a um dos 4 códigos acima no banco de dados.**

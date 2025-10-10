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

# 🔧 Guia Completo: Configurar Prisma Data Proxy

## 📍 Onde estão as URLs?

### 1. **DIRECT_URL** (URL Direta do Banco)
Esta é a URL que você **já tem** atualmente na Vercel!

**Onde encontrar:**
1. Acesse Vercel Dashboard → Seu Projeto
2. Vá em **Settings** → **Environment Variables**
3. Procure por `DATABASE_URL`
4. **Essa é a sua DIRECT_URL!** (URL direta do PostgreSQL)

**Exemplo de formato:**
```
postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require
```

---

### 2. **DATABASE_URL** (URL do Proxy - será gerada)
Esta URL **será gerada** pelo Prisma Data Proxy quando você criar a conta.

**Formato que você receberá:**
```
prisma://aws-us-east-1.prisma-data.cloud/?api_key=SEU_API_KEY_AQUI
```

---

## 🚀 Passo a Passo Completo

### Passo 1: Obter sua DIRECT_URL atual

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **meDIZ**
3. Vá em **Settings** → **Environment Variables**
4. Encontre `DATABASE_URL`
5. **Copie essa URL** - essa é sua `DIRECT_URL`

**⚠️ IMPORTANTE:** Anote essa URL em um lugar seguro! Você vai precisar dela.

---

### Passo 2: Criar conta no Prisma Data Platform

1. Acesse: https://cloud.prisma.io/
2. Clique em **Sign Up** ou **Sign In**
   - Pode usar GitHub, Google, ou email
3. Após login, clique em **Create Project**
4. Dê um nome ao projeto (ex: "meDIZ Production")

---

### Passo 3: Conectar seu Banco PostgreSQL

1. No dashboard do Prisma, clique em **"Add Database"** ou **"Connect Database"**
2. Escolha **"PostgreSQL"**
3. Você verá duas opções:
   - **Option 1: Connect existing database** (recomendado)
   - **Option 2: Create new database**

4. Escolha **"Connect existing database"**
5. Cole sua `DIRECT_URL` (a URL que você copiou da Vercel)
6. Clique em **"Connect"**

**O que acontece:**
- Prisma vai testar a conexão
- Se funcionar, vai criar uma URL proxy para você
- Essa URL proxy é a nova `DATABASE_URL`

---

### Passo 4: Obter a URL do Proxy

Após conectar, você verá:

1. **Connection String** (URL do proxy)
   - Formato: `prisma://aws-us-east-1.prisma-data.cloud/?api_key=xxx`
   - **Essa é a nova DATABASE_URL!**

2. **Direct Connection String** (sua URL original)
   - Essa é a mesma `DIRECT_URL` que você já tinha

**⚠️ IMPORTANTE:** Copie a **Connection String** (URL do proxy)!

---

### Passo 5: Configurar na Vercel

1. Acesse Vercel Dashboard → Seu Projeto → **Settings** → **Environment Variables**

2. **Atualizar DATABASE_URL:**
   - Encontre `DATABASE_URL`
   - Clique em **Edit**
   - Cole a **URL do proxy** que você recebeu do Prisma
   - Salve

3. **Adicionar DIRECT_URL (nova variável):**
   - Clique em **Add New**
   - **Name:** `DIRECT_URL`
   - **Value:** Cole a URL original (a que você tinha antes)
   - **Environment:** Production (e Preview se quiser)
   - Salve

**Resultado final na Vercel:**
```
DATABASE_URL = prisma://aws-us-east-1.prisma-data.cloud/?api_key=xxx
DIRECT_URL = postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require
```

---

### Passo 6: Atualizar Schema Prisma (já feito!)

O `prisma/schema.prisma` já foi atualizado para suportar `directUrl`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // URL do proxy (para aplicação)
  directUrl = env("DIRECT_URL")         // URL direta (para migrations)
}
```

**✅ Já está pronto!** Não precisa fazer nada aqui.

---

### Passo 7: Testar

1. **Fazer deploy na Vercel:**
   - Commit e push das mudanças
   - Vercel vai fazer deploy automaticamente

2. **Verificar logs:**
   - Vercel Dashboard → Deployments → Latest
   - Verifique se não há erros de conexão

3. **Testar aplicação:**
   - Acesse sua aplicação
   - Faça login
   - Verifique se tudo funciona normalmente

---

## ⚠️ IMPORTANTE: Migrations

**Para rodar migrations (Prisma Migrate):**

Sempre use `DIRECT_URL` (não o proxy):

```bash
# Localmente, configure no .env.local:
DIRECT_URL=postgresql://... (sua URL direta)

# Rodar migration:
npx prisma migrate dev
```

**Por quê?**
- Migrations precisam de acesso direto ao banco
- O proxy é otimizado para queries, não para migrations

---

## 🔍 Verificar se está funcionando

### 1. Verificar no Prisma Dashboard:
- Acesse: https://cloud.prisma.io/
- Veja se há conexões ativas
- Veja métricas de uso

### 2. Verificar logs da Vercel:
- Se estiver usando proxy, não verá erros de conexão
- Performance deve melhorar

### 3. Testar localmente (opcional):
```bash
# No .env.local:
DATABASE_URL=prisma://... (URL do proxy)
DIRECT_URL=postgresql://... (URL direta)

# Testar conexão:
npx prisma db pull
```

---

## ❓ FAQ

### "E se eu não quiser usar Prisma Data Proxy?"
Você pode continuar usando a URL direta, mas:
- ⚠️ Risco maior de esgotar conexões em serverless
- ⚠️ Pode ter problemas com 4.000 usuários

### "Posso usar só em produção?"
Sim! Configure:
- **Production:** Use proxy (`DATABASE_URL` = proxy)
- **Preview/Development:** Use direto (`DATABASE_URL` = direto)

### "Quanto custa?"
- **Gratuito:** Até 100 conexões simultâneas
- **Pro:** $20/mês - 500 conexões
- **Team:** $50/mês - 1.000 conexões

Para 4.000 usuários (300 ativos), o plano **Gratuito** provavelmente é suficiente.

---

## 📝 Checklist

- [ ] Obter `DIRECT_URL` atual da Vercel
- [ ] Criar conta no Prisma Data Platform
- [ ] Conectar banco PostgreSQL
- [ ] Obter URL do proxy
- [ ] Atualizar `DATABASE_URL` na Vercel (com URL do proxy)
- [ ] Adicionar `DIRECT_URL` na Vercel (com URL direta original)
- [ ] Fazer deploy
- [ ] Testar aplicação
- [ ] Verificar logs

---

## 🆘 Precisa de Ajuda?

Se tiver dúvidas durante a configuração:
1. Verifique os logs do Prisma Dashboard
2. Verifique os logs da Vercel
3. Teste a conexão localmente primeiro

**Pronto para começar?** 🚀

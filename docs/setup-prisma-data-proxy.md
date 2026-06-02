# 🔧 Setup Prisma Data Proxy - Guia Passo a Passo

## 📋 O que é Prisma Data Proxy?

O Prisma Data Proxy é um serviço que gerencia automaticamente o pool de conexões do PostgreSQL, resolvendo o problema de connection pooling em ambientes serverless como Vercel.

## ✅ Benefícios

- ✅ **Connection pooling automático** - Gerencia conexões para você
- ✅ **Funciona perfeitamente com Vercel** - Otimizado para serverless
- ✅ **Reduz erros de conexão** - Evita "Can't reach database server"
- ✅ **Melhor performance** - Reutiliza conexões eficientemente

## 🚀 Setup Passo a Passo

### Passo 1: Criar Conta no Prisma Data Platform

1. Acesse: https://cloud.prisma.io/
2. Faça login ou crie uma conta
3. Crie um novo projeto

### Passo 2: Conectar seu Banco PostgreSQL

1. No dashboard do Prisma, clique em "Add Database"
2. Escolha "PostgreSQL"
3. Cole sua `DATABASE_URL` atual (da Vercel)
4. Prisma vai criar uma URL proxy para você

### Passo 3: Obter URL do Proxy

A URL do proxy terá formato:
```
prisma://aws-us-east-1.prisma-data.cloud/?api_key=xxx
```

### Passo 4: Atualizar na Vercel

1. Acesse Vercel Dashboard → Seu Projeto → Settings → Environment Variables
2. Atualize `DATABASE_URL` com a URL do proxy
3. **IMPORTANTE:** Mantenha a URL original como `DIRECT_URL` (para migrations)

### Passo 5: Configurar Variáveis de Ambiente

Na Vercel, configure:
```
DATABASE_URL=prisma://... (URL do proxy)
DIRECT_URL=postgresql://... (URL direta original - para migrations)
```

### Passo 6: Atualizar schema.prisma

Atualizar `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Para migrations
}
```

### Passo 7: Testar

1. Fazer deploy na Vercel
2. Testar conexão com banco
3. Verificar logs para confirmar que está usando proxy

## ⚠️ IMPORTANTE

- **Migrations:** Sempre use `DIRECT_URL` (não o proxy)
- **Aplicação:** Sempre use `DATABASE_URL` (proxy)
- **Local:** Você pode usar `DIRECT_URL` também

## 🔄 Alternativa: PgBouncer (Se não quiser usar Prisma Data Proxy)

Se preferir não usar Prisma Data Proxy, pode configurar PgBouncer:

1. Criar instância PgBouncer (Railway, Render, etc.)
2. Configurar pool size
3. Atualizar `DATABASE_URL` para apontar para PgBouncer

**Custo:** ~$5-10/mês (servidor PgBouncer)

## 📊 Comparação

| Aspecto | Prisma Data Proxy | PgBouncer |
|---------|-------------------|-----------|
| Custo | $0-20/mês | $5-10/mês |
| Setup | Fácil | Médio |
| Manutenção | Automática | Manual |
| Integração Vercel | Nativa | Requer servidor |

**Recomendação:** Prisma Data Proxy (mais fácil e integrado)

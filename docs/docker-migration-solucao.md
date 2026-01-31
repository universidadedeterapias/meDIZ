# 🔧 Solução: Rodar Migrations no Docker

## ⚠️ Problema

O Prisma CLI sempre lê do `.env` primeiro, mesmo com variáveis de ambiente ou `.env.local`. Isso causa erro ao tentar conectar no Prisma Data Proxy quando você quer usar o Docker local.

## ✅ Solução Simples

### Opção 1: Usar `.env.local` e rodar app (Recomendado)

O **Next.js** carrega `.env.local` automaticamente! Então:

1. **Você já tem `.env.local` criado** ✅
2. **Apenas rode a aplicação normalmente:**
   ```bash
   npm run dev
   ```
3. **O Prisma vai usar o `.env.local` automaticamente** quando a app rodar!

**Nota:** As migrations serão aplicadas automaticamente quando a aplicação iniciar (se necessário).

### Opção 2: Rodar Migration Manualmente (Se necessário)

Se realmente precisar rodar migrations manualmente:

1. **Temporariamente renomeie o `.env`:**
   ```powershell
   Rename-Item .env .env.backup
   ```

2. **Rode a migration:**
   ```powershell
   npx prisma migrate dev
   ```

3. **Restaure o `.env`:**
   ```powershell
   Rename-Item .env.backup .env
   ```

### Opção 3: Usar Script Automatizado

Já criamos o script `npm run migrate:docker` que faz isso automaticamente, mas está com problema de autenticação. Pode ser um problema específico do Windows + Docker.

---

## 🎯 Recomendação

**Para desenvolvimento local, você NÃO precisa rodar migrations manualmente!**

1. ✅ Containers Docker rodando (`mediz-postgres-dev`, `mediz-redis-dev`)
2. ✅ `.env.local` configurado com DATABASE_URL do Docker
3. ✅ Apenas rode `npm run dev`

O Next.js vai:
- Carregar `.env.local` automaticamente
- Conectar no banco Docker
- Aplicar migrations se necessário (via Prisma)

---

## 📝 Resumo

- **`.env`** → Produção (Prisma Data Proxy) - não modificar
- **`.env.local`** → Desenvolvimento (Docker) - já está criado ✅
- **Next.js** → Usa `.env.local` automaticamente ✅
- **Prisma CLI** → Lê `.env` primeiro (por isso o problema)

**Solução:** Use `npm run dev` e deixe o Next.js gerenciar as conexões! 🚀

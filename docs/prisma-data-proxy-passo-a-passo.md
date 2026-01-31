# Prisma Data Proxy – Passo a Passo

Guia objetivo para configurar o Prisma Data Proxy (connection pooling) na Vercel.  
Para mais detalhes e FAQ, veja [guia-configuracao-prisma-proxy.md](./guia-configuracao-prisma-proxy.md).

---

## Antes de começar

- Você precisa da **URL direta** do seu PostgreSQL (Neon, Supabase, Vercel Postgres, etc.).
- O `prisma/schema.prisma` do meDIZ já está preparado com `url` e `directUrl`.

---

## Passo 1: Copiar a URL direta do banco

1. Abra **Vercel** → seu projeto **meDIZ** → **Settings** → **Environment Variables**.
2. Localize **DATABASE_URL** (ou a variável que hoje aponta para o Postgres).
3. **Copie** esse valor e guarde em lugar seguro.  
   Essa é a sua **DIRECT_URL** (ex.: `postgresql://user:pass@host:5432/dbname?sslmode=require`).

---

## Passo 2: Entrar no Prisma Data Platform

1. Acesse: **https://cloud.prisma.io/**
2. Faça **Sign In** ou **Sign Up** (GitHub, Google ou e-mail).
3. No dashboard, clique em **Create project** (ou **New project**).
4. Dê um nome (ex.: **meDIZ Production**) e confirme.

---

## Passo 3: Conectar o banco ao Prisma

1. Dentro do projeto, procure **Connect database** ou **Add database** (ou **Accelerate** / **Data Proxy**, dependendo do layout).
2. Escolha **PostgreSQL**.
3. Selecione **Connect existing database**.
4. Cole a **DIRECT_URL** que você copiou no Passo 1.
5. Clique em **Connect** (ou **Test and save**).
6. Aguarde o Prisma validar a conexão.

---

## Passo 4: Copiar a URL do Proxy

Depois de conectar, o Prisma mostra:

- **Connection string** (começa com `prisma://` ou usa domínio tipo `prisma-data.cloud` ou `accelerate.prisma-data.net`).  
  → Essa será a nova **DATABASE_URL**.
- **Direct connection** (ou similar): é a mesma URL direta que você já tem.  
  → Essa é a **DIRECT_URL**.

**Copie e guarde** a **Connection string** (URL do proxy).

---

## Passo 5: Configurar variáveis na Vercel

1. Vercel → projeto **meDIZ** → **Settings** → **Environment Variables**.

2. **DATABASE_URL**  
   - Edite a variável **DATABASE_URL**.  
   - **Value:** cole a **URL do proxy** (a que começa com `prisma://` ou do Prisma Data Platform).  
   - Marque **Production** (e **Preview** se quiser usar o proxy em previews).  
   - Salve.

3. **DIRECT_URL**  
   - **Add New**.  
   - **Name:** `DIRECT_URL`  
   - **Value:** a URL **direta** do Postgres (a que você copiou no Passo 1).  
   - **Environments:** Production (e Preview se for rodar migrations em preview).  
   - Salve.

Resultado esperado:

- `DATABASE_URL` = URL do proxy (uso da aplicação).
- `DIRECT_URL` = URL direta do Postgres (migrations e scripts).

---

## Passo 6: Rodar migrations (local ou CI)

Migrations usam sempre a **URL direta**, não o proxy.

**No seu PC:**

1. Crie ou use um `.env.local` na raiz do projeto com:
   ```env
   DIRECT_URL=postgresql://...sua-url-direta...
   DATABASE_URL=prisma://...url-do-proxy...   # opcional para migrate; a app na Vercel usa essa
   ```
2. Rode:
   ```bash
   npx prisma migrate dev
   ```

**No GitHub Actions (ou outro CI):** use o secret `DIRECT_URL` para migrations (o workflow já pode estar usando `DATABASE_URL`; para migrate, o Prisma usa `directUrl` do schema, ou seja, `DIRECT_URL`).

---

## Passo 7: Deploy e teste

1. Faça **deploy** na Vercel (push no repositório ou deploy manual).
2. Abra a aplicação em produção e teste login e telas que usam banco.
3. Em **Vercel** → **Deployments** → último deploy → **Logs**, confira se não há erros de conexão com o banco.

---

## Resumo das variáveis

| Variável      | Onde usar        | Valor |
|---------------|------------------|--------|
| **DATABASE_URL** | Vercel (produção) | URL do **proxy** (Prisma) |
| **DIRECT_URL**   | Vercel + local   | URL **direta** do Postgres |

O `schema.prisma` já está assim:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // proxy na Vercel
  directUrl = env("DIRECT_URL")    // direta para migrations
}
```

Nada precisa ser alterado no schema para seguir este passo a passo.

---

## Checklist

- [ ] Copiei a URL direta do banco (Passo 1).
- [ ] Criei projeto no Prisma Data Platform (Passo 2).
- [ ] Conectei o banco existente (Passo 3).
- [ ] Copiei a URL do proxy (Passo 4).
- [ ] Atualizei **DATABASE_URL** na Vercel com a URL do proxy (Passo 5).
- [ ] Criei **DIRECT_URL** na Vercel com a URL direta (Passo 5).
- [ ] Fiz deploy e testei a aplicação (Passo 7).

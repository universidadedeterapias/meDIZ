# Documentação Técnica — meDIZ

Plataforma de IA conversacional para saúde e bem-estar que conecta usuários a conteúdos terapêuticos, biblioteca digital, audioterapias e ferramentas premium de organização clínica.

**Versão do app:** `0.1.0`  
**Repositório:** [universidadedeterapias/meDIZ](https://github.com/universidadedeterapias/meDIZ)

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estrutura do projeto](#3-estrutura-do-projeto)
4. [Autenticação e autorização](#4-autenticação-e-autorização)
5. [Modelo de dados](#5-modelo-de-dados)
6. [Módulos principais](#6-módulos-principais)
7. [Fluxos de negócio](#7-fluxos-de-negócio)
8. [Integrações externas](#8-integrações-externas)
9. [Variáveis de ambiente](#9-variáveis-de-ambiente)
10. [Scripts e deploy](#10-scripts-e-deploy)
11. [Segurança](#11-segurança)
12. [Documentação relacionada](#12-documentação-relacionada)

---

## 1. Visão geral

### Propósito

O meDIZ oferece:

- **Chat de pesquisa** (`/chat`) — busca de sintomas e contexto biológico via IA (n8n)
- **Simulador** (`/simulador`) — chat conversacional guiado (premium)
- **Professor Paulo** (`/prof`) — chat educacional (premium)
- **Biblioteca** — PDFs e livros digitais com anti-pirataria
- **Audioterapias e cursos** — streaming protegido via Cloudflare R2
- **Organização** — pastas de sintomas, dashboard, exportação PDF (premium)
- **Assinaturas** — Stripe e Hotmart
- **Admin** — painel `@mediz.com` para usuários, catálogo, métricas e push

### Arquitetura (alto nível)

```
┌─────────────┐     HTTPS      ┌──────────────────┐
│   Browser   │ ◄────────────► │  Next.js 15      │
│   (PWA)     │   JWT cookie   │  App Router      │
└─────────────┘                └────────┬─────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
   ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
   │ PostgreSQL  │              │ Cloudflare  │              │    n8n      │
   │  (Prisma)   │              │     R2      │              │  (webhooks) │
   └─────────────┘              └─────────────┘              └─────────────┘
          │                             │
          ▼                             ▼
   ┌─────────────┐              ┌─────────────┐
   │    Redis    │              │ Cloudinary  │
   │  (cache)    │              │  (avatars)  │
   └─────────────┘              └─────────────┘

Webhooks de entrada: Stripe, Hotmart, Stone (Pagar.me)
Saída: Z-API (WhatsApp), Web Push (VAPID)
```

---

## 2. Stack tecnológico

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, TypeScript 5.8, Tailwind CSS 3.4 |
| Componentes | Radix UI / shadcn, Framer Motion |
| ORM | Prisma 6.x |
| Banco | PostgreSQL |
| Auth | NextAuth v5 (JWT, Prisma Adapter) |
| Pagamentos | Stripe 18.x |
| Mídia | Cloudflare R2, Cloudinary |
| Cache/filas | Redis, BullMQ (lembretes) |
| PDF | pdf-lib, Puppeteer |
| i18n | pt-BR, pt-PT, en, es |

---

## 3. Estrutura do projeto

```
meDIZ/
├── prisma/
│   ├── schema.prisma          # Modelos e enums
│   └── migrations/            # Migrations SQL
├── public/
│   └── biblioteca/            # PDFs legados (migração para R2)
├── docs/                      # Documentação
├── scripts/                   # Deploy, backup, migração
└── src/
    ├── app/                   # Páginas e API Routes (App Router)
    │   ├── api/               # ~107 endpoints REST
    │   ├── admin/             # Painel administrativo
    │   ├── chat/              # Chat principal
    │   ├── simulador/         # Chat simulador
    │   ├── prof/              # Professor Paulo
    │   ├── biblioteca/        # Biblioteca digital
    │   ├── audioterapia/      # Audioterapias
    │   └── cursos/            # Cursos em vídeo
    ├── auth.ts                # Configuração NextAuth v5
    ├── middleware.ts          # Proteção /admin/*
    ├── components/            # UI React
    ├── contexts/              # Contextos (usuário, etc.)
    ├── hooks/                 # Hooks customizados
    ├── i18n/                  # Traduções
    ├── lib/                   # Lógica de negócio
    │   ├── purchases/         # Entitlements e webhooks de compra
    │   ├── library/           # Stream, PDF, permissões
    │   ├── catalog/           # Produtos do catálogo
    │   ├── conversational-chat/
    │   └── hotmart/ / stone/
    └── types/                 # Tipos TypeScript
```

### Convenções de código

- **Imports absolutos:** `@/components/...`, `@/lib/...`
- **Server Components** por padrão; `'use client'` apenas quando necessário
- **API Routes:** `src/app/api/<recurso>/route.ts`
- **Validação:** Zod em formulários e bodies de API críticos

---

## 4. Autenticação e autorização

**Arquivo central:** `src/auth.ts`

| Aspecto | Configuração |
|---------|--------------|
| Estratégia de sessão | JWT (não persiste sessão no banco) |
| Duração | 30 dias |
| Providers | Google OAuth + Credentials (bcrypt) |
| Adapter | PrismaAdapter (contas OAuth) |
| Cookie (prod) | `__Secure-authjs.session-token` |

### Níveis de acesso

| Nível | Como é verificado | Uso |
|-------|-------------------|-----|
| Público | Sem sessão | `/api/health`, `/api/symptoms/popular`, signup |
| Sessão | `auth()` do NextAuth | Maioria das rotas de usuário |
| `requireUser()` | Sessão + bloqueio se `mustResetPassword` | Biblioteca, catálogo, downloads |
| Premium | `isUserPremium(userId)` | Chat simulador/prof, pastas, PDF export |
| Admin | Email `@mediz.com` via `requireAdmin()` | `/api/admin/*` |
| Webhook | Bearer `WEBHOOK_SECRET_TOKEN` ou Hottok Hotmart | Integrações externas |
| Cron | `CRON_SECRET` ou header `x-vercel-cron` | Jobs agendados |

### Middleware

`src/middleware.ts` protege **páginas** `/admin/*` (exceto `/admin-login`).  
As **rotas API** `/api/admin/*` fazem verificação própria em cada handler.

### Fluxos de autenticação

1. **Cadastro:** `POST /api/auth/signup` → token WhatsApp → `POST /api/confirm-signup`
2. **Login:** `/login` → NextAuth → cookie JWT
3. **Reset senha:** `POST /api/request-reset-whatsapp` → `POST /api/reset-password`
4. **Senha obrigatória:** flag `mustResetPassword` bloqueia APIs até `POST /api/auth/change-password`
5. **Google OAuth:** vincula conta existente se o e-mail já estiver cadastrado

### Premium

Fonte de verdade em `src/lib/premiumUtils.ts`:

- Assinatura ativa em `Subscription` com `currentPeriodEnd >= now` e status elegível (`active`, `trialing`, `past_due`, `cancel_at_period_end`, `paused`, ou `canceled` dentro do período)
- Lista de cortesia em `src/lib/complimentaryAccess.ts` (`PREMIUM_FULL_ACCESS_EMAILS`, `LIBRARY_FULL_ACCESS_EMAILS`, etc.)

---

## 5. Modelo de dados

**Schema:** `prisma/schema.prisma`

### Grupos de modelos

| Grupo | Modelos | Descrição |
|-------|---------|-----------|
| Auth | `User`, `Account`, `Session`, `VerificationToken` | Usuários e OAuth |
| Assinatura | `Plan`, `Subscription`, `PendingHotmartPurchase` | Stripe/Hotmart |
| Chat | `ChatSession`, `ChatMessage`, `ChatAnswerCache` | Conversas e cache |
| Sintomas | `SymptomFolder`, `SavedSymptom` | Organização premium |
| Catálogo | `CatalogProduct`, `CatalogCourseModule`, `CatalogModuleMedia`, `CatalogProductExternalId`, `CatalogProductGrant` | Produtos digitais e módulos de curso |
| Acesso | `ProductEntitlement`, `LibraryPermission` | Permissões pós-compra |
| Downloads | `PdfDownload`, `PdfDownloadToken` | PDF com marca d'água |
| Engajamento | `PopupConfig`, `PushSubscription`, `Reminder` | Popup e notificações |
| Admin | `AuditLog`, `AdminRequest`, `LogExecucao` | Auditoria |

### Enums importantes

```prisma
enum ChatKind {
  SEARCH      // Chat principal (/chat)
  SIMULADOR   // /simulador
  PROF        // /prof
}

enum CatalogSection {
  BIBLIOTECA
  AUDIOTERAPIA
  CURSO
}

enum PaymentProvider {
  HOTMART
  STONE
  STRIPE
  MANUAL
}
```

### Comandos Prisma

```bash
npx prisma generate          # Gera client
npx prisma migrate dev       # Migration em dev
npx prisma migrate deploy    # Migration em produção
npx prisma studio            # UI visual
```

---

## 6. Módulos principais

### Compras e entitlements (`src/lib/purchases/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `grant-purchase.ts` | Concede acesso após webhook Hotmart/Stone |
| `resolve-product.ts` | Resolve produto por ID externo |
| `entitlements.ts` | Consulta entitlements por e-mail |
| `catalog-grants.ts` | Regra "compra A libera B" |
| `notify-n8n-new-user.ts` | Dispara onboarding WhatsApp via n8n |

### Biblioteca (`src/lib/library/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `permissions.ts` | Permissões PDF / livro / audioterapia |
| `media-access-token.ts` | Token HMAC para stream |
| `watermark-pdf.ts` | Marca d'água com dados do usuário |
| `pdf-download-token.ts` | Token de download único |
| `pdf-download-limits.ts` | Cota mensal de downloads |
| `validate-pdf-download.ts` | Valida entitlement antes do download |

### Chat (`src/lib/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `assistant.ts` | Integração n8n — chat de sintomas |
| `chatService.ts` | Cria `ChatSession` com `threadId` e `chatKind` |
| `chatMessages.ts` | Persiste e lê mensagens |
| `conversational-chat/webhook.ts` | Simulador e Professor Paulo |
| `userPeriod.ts` | Limites do plano gratuito |

### Catálogo (`src/lib/catalog/`)

Gestão de produtos, mídias por idioma, política R2 e upload admin.

---

## 7. Fluxos de negócio

### 7.1 Chat de pesquisa (gratuito com limites)

```
Usuário → POST /api/openai { message, language }
       → Verifica limites (userPeriod)
       → Webhook n8n (N8N_CHAT_WEBHOOK_URL)
       → Salva ChatSession (SEARCH) + ChatMessage
       → Retorna markdown + threadId
```

### 7.2 Chat conversacional (premium)

```
Usuário → POST /api/conversational-chat { message, chatKind, threadId?, language }
       → isUserPremium()
       → Cria/recupera ChatSession (SIMULADOR | PROF)
       → Webhook n8n conforme chatKind
       → Persiste mensagens USER + ASSISTANT
```

### 7.3 Compra Hotmart / Stone → biblioteca

```
Hotmart/Stone → POST webhook
            → resolve-product (ID externo → CatalogProduct)
            → grantPurchaseAccess (ProductEntitlement)
            → Cria usuário com senha temporária (se novo)
            → notifyN8nNewUser (N8N_NEW_USER_WEBHOOK_URL)
```

### 7.4 Download de PDF com marca d'água

```
Usuário → POST /api/library/download/request { productId }
       → Valida entitlement + cota mensal
       → Retorna URL com token único (TTL curto)
Usuário → GET /api/library/download/file?token=...
       → Gera PDF com watermark (nome, e-mail, CPF)
       → Registra PdfDownload
```

### 7.5 Stream de audioterapia

```
Usuário → GET /api/catalog/products/[id]/media
       → Valida entitlement
       → Retorna URL com token HMAC (/api/library/stream)
```

---

## 8. Integrações externas

| Serviço | Variáveis | Endpoints / libs |
|---------|-----------|------------------|
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `/api/stripe/*` |
| **Hotmart** | `HOTMART_HOTTOK`, `HOTMART_MEDIZ_PRODUCT_ID` | `POST /api/hotmart` |
| **Stone** | (sem secret ativo) | `POST /api/stone/webhook` |
| **n8n** | `N8N_*_WEBHOOK_URL` | Chat, simulador, prof, onboarding |
| **Cloudflare R2** | `R2_*` | Upload presign, mídia biblioteca |
| **Cloudinary** | `CLOUDINARY_*` | Avatars, popup |
| **Z-API** | `ZAPI_*` | WhatsApp signup/reset |
| **Web Push** | `VAPID_*` | `/api/push/*` |
| **Redis** | `REDIS_URL` | Cache sintomas, BullMQ |
| **Google OAuth** | `GOOGLE_CLIENT_*` | Login social |

---

## 9. Variáveis de ambiente

Referência completa em `.env.example`. Principais grupos:

### Obrigatórias (produção)

- `DATABASE_URL`, `DIRECT_URL`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `PUBLIC_APP_URL` / `NEXT_PUBLIC_APP_URL`

### Pagamentos e webhooks

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `HOTMART_HOTTOK`, `WEBHOOK_SECRET_TOKEN`

### IA e n8n

- `N8N_CHAT_WEBHOOK_URL`
- `N8N_SIMULADOR_WEBHOOK_URL`
- `N8N_PROFESSOR_PAULO_WEBHOOK_URL`
- `N8N_NEW_USER_WEBHOOK_URL`

### Biblioteca (R2)

- `R2_ACCOUNT_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`

### Opcionais mas recomendadas

- `REDIS_URL`, `CRON_SECRET`
- `ZAPI_*` (WhatsApp)
- `VAPID_*` (push notifications)
- `LIBRARY_FULL_ACCESS_EMAILS`, `PREMIUM_FULL_ACCESS_EMAILS`

> **Importante:** não commitar `.env`. Valores com espaço após `=` quebram a leitura da variável.

---

## 10. Scripts e deploy

### Desenvolvimento

```bash
npm run dev          # prisma generate + next dev
npm run build        # Build produção
npm run check:deploy # Valida TS + ESLint + Prisma
npm run build:safe   # check:deploy + build
```

### Operação

```bash
npm run sync:catalog-purchase-mapping   # Sincroniza IDs Hotmart/Stone do código → banco
npm run migrate:library-permissions     # Migra library_permissions → entitlements
npx prisma migrate deploy               # Aplica migrations em produção
```

### Deploy (Vercel)

1. Configurar variáveis de ambiente no painel Vercel
2. `npm run check:deploy` localmente antes do push
3. Após deploy: `npx prisma migrate deploy` no banco de produção
4. Verificar `GET /api/health`

---

## 11. Segurança

- **Segredos:** apenas em variáveis de ambiente; nunca no código ou git
- **Webhooks:** validação por assinatura (Stripe), Hottok (Hotmart) ou Bearer token
- **Mídia:** tokens HMAC com TTL; PDFs com marca d'água identificável
- **Downloads:** token de uso único; cota mensal por usuário
- **Admin:** e-mail `@mediz.com` + auditoria em `AuditLog`
- **Rate limiting:** login falho → bloqueio de IP (`src/lib/ipBlocker.ts`)
- **`.gitignore`:** ignora `.env*`, backups, dumps, credenciais

---

## 12. Documentação relacionada

| Documento | Conteúdo |
|-----------|----------|
| [DOCUMENTACAO-API.md](./DOCUMENTACAO-API.md) | Referência completa da API REST |
| [.env.example](../.env.example) | Variáveis de ambiente |
| [n8n-mediz-novo-cliente-workflow.json](./n8n-mediz-novo-cliente-workflow.json) | Workflow onboarding |
| [monitoring-endpoints.md](./monitoring-endpoints.md) | Health check e monitoramento |
| [pwa-setup.md](./pwa-setup.md) | Instalação PWA e push |
| [plano-gratuito-regras-uso.md](./plano-gratuito-regras-uso.md) | Limites do plano free |

---

*Última atualização: junho de 2026 — branch `newmediz`*

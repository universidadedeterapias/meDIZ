# Documentação da API — meDIZ

Referência dos endpoints REST expostos pelo Next.js App Router.

**Base URL**

| Ambiente | URL |
|----------|-----|
| Desenvolvimento | `http://localhost:3000` |
| Produção | `https://mediz.app` |

**Formato padrão:** JSON (`Content-Type: application/json`), salvo indicação contrária.

**Documentação técnica geral:** [DOCUMENTACAO-TECNICA.md](./DOCUMENTACAO-TECNICA.md)

---

## Índice

1. [Convenções](#1-convenções)
2. [Autenticação](#2-autenticação)
3. [Health e utilitários](#3-health-e-utilitários)
4. [Usuário e conta](#4-usuário-e-conta)
5. [Chat e IA](#5-chat-e-ia)
6. [Sintomas e pastas](#6-sintomas-e-pastas)
7. [Assinaturas e pagamentos](#7-assinaturas-e-pagamentos)
8. [Biblioteca e catálogo](#8-biblioteca-e-catálogo)
9. [Push notifications](#9-push-notifications)
10. [Admin](#10-admin)
11. [Webhooks externos](#11-webhooks-externos)
12. [Códigos de erro comuns](#12-códigos-de-erro-comuns)

---

## 1. Convenções

### Tipos de autenticação

| Código | Descrição |
|--------|-----------|
| `public` | Sem autenticação |
| `session` | Cookie JWT NextAuth (`auth()`) |
| `user` | `requireUser()` — sessão + sem `mustResetPassword` |
| `premium` | Sessão + `isUserPremium(userId) === true` |
| `admin` | E-mail `@mediz.com` (`requireAdmin()`) |
| `webhook` | `Authorization: Bearer {WEBHOOK_SECRET_TOKEN}` |
| `stripe` | Header `stripe-signature` |
| `hotmart` | Header Hottok Hotmart |
| `cron` | `Authorization: Bearer {CRON_SECRET}` ou `x-vercel-cron` |

### Respostas de erro padrão

```json
{ "error": "Mensagem legível" }
```

Códigos HTTP usados: `400`, `401`, `403`, `404`, `429`, `500`, `502`, `503`, `504`.

---

## 2. Autenticação

### NextAuth

```
GET|POST /api/auth/[...nextauth]
```

Handlers do NextAuth v5 (login, logout, callback OAuth).

**Providers:** Google OAuth, Credentials (e-mail + senha).

---

### Cadastro

```
POST /api/auth/signup
```

**Auth:** `public`

**Body:**

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "whatsapp": "string"
}
```

**Respostas:** `201` usuário criado; `400` validação; `409` e-mail já existe.

---

### Confirmar cadastro

```
POST /api/confirm-signup
```

**Auth:** `public`

**Body:**

```json
{
  "token": "string",
  "code": "string"
}
```

---

### Reenviar verificação WhatsApp

```
POST /api/verify-signup
```

**Auth:** `public`

---

### Atualizar WhatsApp

```
POST /api/auth/update-whatsapp
```

**Auth:** `session`

---

### Trocar senha (logado)

```
POST /api/auth/change-password
```

**Auth:** `session` (única rota permitida com `mustResetPassword`)

**Body:**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

---

### Reset de senha

```
POST /api/request-reset-whatsapp
```

**Auth:** `public` — envia link/código via Z-API.

```
POST /api/reset-password
```

**Auth:** `public`

**Body:**

```json
{
  "token": "string",
  "password": "string"
}
```

---

### Debug de sessão

```
GET /api/auth-debug
```

**Auth:** `session` (opcional)

**Resposta:**

```json
{
  "session": { ... },
  "isAdmin": false
}
```

---

## 3. Health e utilitários

### Health check

```
GET /api/health
```

**Auth:** `public`

**Resposta `200`:**

```json
{
  "status": "online",
  "timestamp": "2026-06-15T12:00:00.000Z",
  "version": "0.1.0",
  "services": {
    "database": { "status": "healthy", "responseTime": 42 },
    "redis": { "status": "healthy" },
    "environment": { "status": "healthy" }
  },
  "uptime": 3600
}
```

---

### Popup promocional

```
GET /api/popup
```

**Auth:** `public` — retorna popup ativo para exibição no chat gratuito.

---

### Sugestões

```
POST /api/suggestion
```

**Auth:** `public` — encaminha sugestão para webhook n8n.

---

### Planos Stripe

```
GET /api/plans
```

**Auth:** `public` — lista planos disponíveis.

---

## 4. Usuário e conta

### Perfil

```
GET /api/user
PATCH /api/user
```

**Auth:** `session`

**GET — resposta (campos principais):**

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "image": "string|null",
  "cpf": "string|null",
  "whatsapp": "string|null",
  "preferredLanguage": "pt-BR"
}
```

---

### Formulário de onboarding

```
POST /api/user/form
```

**Auth:** `session`

**Body:** dados profissionais (profissão, especialidade, etc.).

---

### Avatar

```
POST /api/user/avatar
```

**Auth:** `session`  
**Body:** `multipart/form-data` com imagem → upload Cloudinary.

---

### Sidebar do usuário

```
GET /api/user/sidebar
```

**Auth:** `session`

---

### Preferência de notificações

```
GET /api/user/notifications-preference
POST /api/user/notifications-preference
```

**Auth:** `session`

---

## 5. Chat e IA

### Chat principal (pesquisa de sintomas)

```
POST /api/openai
```

**Auth:** `session`  
**Premium:** não obrigatório (limites por `userPeriod` no plano gratuito)

**Body:**

```json
{
  "message": "dor nas costas",
  "language": "pt-BR"
}
```

**Resposta `200`:**

```json
{
  "threadId": "uuid",
  "responses": {
    "assistant": ["markdown..."],
    "user": ["dor nas costas"]
  },
  "userPeriod": "first-week",
  "fullVisualization": true,
  "shouldShowPopup": false
}
```

**Erros:**

| Status | Condição |
|--------|----------|
| `401` | Não autenticado |
| `403` | `limitReached: true` — limite diário gratuito |
| `502` | Falha no webhook n8n |

---

### Mensagens de thread

```
GET /api/openai/messages?threadId={uuid}
GET /api/openai/messages/user-messages?threadId={uuid}
```

**Auth:** `session`

---

### Chat conversacional (Simulador / Professor Paulo)

```
GET /api/conversational-chat?threadId={uuid}
POST /api/conversational-chat
```

**Auth:** `session` + **premium obrigatório**

**POST — Body:**

```json
{
  "message": "Olá",
  "chatKind": "SIMULADOR",
  "threadId": "uuid-opcional",
  "language": "pt-BR"
}
```

`chatKind`: `"SIMULADOR"` | `"PROF"`

**Resposta `200`:**

```json
{
  "threadId": "uuid",
  "chatKind": "SIMULADOR",
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "Olá",
      "createdAt": "2026-06-15T12:00:00.000Z"
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "Resposta da IA...",
      "createdAt": "2026-06-15T12:00:01.000Z"
    }
  ]
}
```

**Erros:**

| Status | Mensagem |
|--------|----------|
| `403` | Recurso disponível apenas para assinantes premium |
| `502` | Erro ao comunicar com o serviço de IA |
| `504` | A IA demorou para responder |

---

### Sessões conversacionais

```
GET /api/conversational-chat/sessions?chatKind=SIMULADOR
```

**Auth:** `session`

**Resposta:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "threadId": "uuid",
      "createdAt": "2026-06-15T12:00:00.000Z",
      "firstUserMessage": "primeira mensagem"
    }
  ]
}
```

---

### Sessões de chat (legado)

```
GET /api/chat/sessions
```

**Auth:** `session`

---

### Exportar PDF de conversa

```
POST /api/chat/pdf
POST /api/export-pdf
```

**Auth:** `session` + **premium**

---

## 6. Sintomas e pastas

> Requer **premium** para criar/editar pastas e salvar sintomas.

### Pastas

```
GET  /api/folders
POST /api/folders
PUT  /api/folders/[id]
DELETE /api/folders/[id]
```

**Auth:** `session` + premium

**POST — Body:**

```json
{
  "name": "Meus pacientes",
  "description": "opcional"
}
```

---

### Sintomas salvos

```
POST /api/symptoms
PATCH /api/symptoms/[id]
DELETE /api/symptoms/[id]
```

**Auth:** `session` + premium

---

### Sintomas populares

```
GET /api/symptoms/popular
```

**Auth:** `public` — cache Redis/arquivo.

---

### Dashboard de sintomas

```
GET /api/symptoms/dashboard
GET /api/symptoms/global
```

**Auth:** `session`

---

### Job de sintomas populares (cron)

```
POST /api/symptoms/update-popular
```

**Auth:** `cron`

---

## 7. Assinaturas e pagamentos

### Stripe Checkout

```
POST /api/stripe/checkout
```

**Auth:** `session`

**Body:**

```json
{
  "priceId": "price_xxx"
}
```

**Resposta:** `{ "url": "https://checkout.stripe.com/..." }`

---

### Status da assinatura

```
GET /api/stripe/subscription
```

**Auth:** `session`

---

### Cancelar assinatura

```
PATCH /api/stripe/subscription/cancel
```

**Auth:** `session`

---

### Faturas

```
GET /api/stripe/invoices
```

**Auth:** `session`

---

## 8. Biblioteca e catálogo

### Permissões do usuário

```
GET /api/me/library
```

**Auth:** `user`

**Resposta:**

```json
{
  "tem_acesso_a_biblioteca": true,
  "permissoes": {
    "audioterapia": true,
    "pdf": true,
    "livro_digital": true
  }
}
```

---

### Audioterapias do usuário

```
GET /api/me/audioterapia
```

**Auth:** `user`

---

### Catálogo de produtos

```
GET /api/catalog/products
GET /api/catalog/products/[id]
GET /api/catalog/products/[id]/media
GET /api/catalog/products/[id]/media?list=1
```

**Auth:** `user`  
**`/media`:** exige entitlement para o produto.

**`?list=1` (cursos / VIDEO):** retorna módulos com mídia resolvida por idioma:

```json
{
  "locale": "pt",
  "modules": [
    {
      "id": "uuid",
      "title": "Módulo 1",
      "coverImageUrl": "https://...",
      "sortOrder": 0,
      "media": {
        "video": { "url": "...", "title": "Vídeo" },
        "pdf": { "url": "...", "title": "Material PDF" },
        "audio": null
      }
    }
  ],
  "video": { "url": "...", "title": "..." },
  "pdf": { "url": "...", "title": "..." }
}
```

Cursos legados (`mediaItems` JSON) são migrados automaticamente para um módulo na primeira leitura.

---

### Stream protegido

```
GET /api/library/stream?token={hmac}&...
```

**Auth:** token HMAC gerado internamente (TTL configurável).

---

### Download de PDF com marca d'água

```
POST /api/library/download/request
```

**Auth:** `user` + entitlement PDF

**Body:**

```json
{
  "productId": "uuid-do-produto"
}
```

**Resposta `200`:**

```json
{
  "downloadUrl": "https://mediz.app/api/library/download/file?token=...",
  "expiresAt": "2026-06-15T12:15:00.000Z",
  "expiresInSeconds": 900,
  "quota": {
    "used": 1,
    "limit": 5,
    "remaining": 4
  }
}
```

**Erros:** `429 PDF_DOWNLOAD_QUOTA_EXCEEDED`

---

```
GET /api/library/download/file?token={token}
```

**Auth:** token de uso único  
**Resposta:** arquivo PDF (`application/pdf`) com marca d'água.

---

### Servir conteúdo legado

```
GET /api/biblioteca/pdf
GET /api/biblioteca/livro-digital
GET /api/audioterapia
```

**Auth:** `user` + permissão/entitlement

---

### Consultar cliente (webhook / n8n)

```
GET /api/webhooks/customer?email=cliente@email.com
```

**Auth:** `Bearer {WEBHOOK_SECRET_TOKEN}` (mesmo token de `/api/library/permissions`)

**Resposta — cliente cadastrado:**

```json
{
  "exists": true,
  "email": "cliente@email.com",
  "user": {
    "id": "uuid",
    "email": "cliente@email.com",
    "name": "Maria",
    "full_name": "Maria Silva",
    "whatsapp": "11999999999",
    "cpf": "12345678901",
    "must_reset_password": true,
    "has_temporary_password": true,
    "email_verified": true,
    "created_at": "2026-06-15T12:00:00.000Z"
  },
  "permissoes": {
    "audioterapia": true,
    "pdf": true,
    "livro_digital": false
  },
  "products_granted": [
    {
      "id": "uuid",
      "title": "Nome do produto",
      "permissionKey": "VIDEO",
      "source": "hotmart"
    }
  ]
}
```

**Resposta — e-mail sem cadastro:**

```json
{
  "exists": false,
  "email": "cliente@email.com",
  "user": null,
  "permissoes": {
    "audioterapia": false,
    "pdf": false,
    "livro_digital": false
  },
  "products_granted": []
}
```

**Notas:** não retorna senha nem `temporary_password_plain`. `has_temporary_password` indica se ainda há senha temporária pendente de envio/troca.

---

### Permissões via webhook (deprecated)

```
PUT /api/library/permissions
```

**Auth:** `webhook` (Bearer)  
**Status:** deprecated — usar entitlements via Hotmart/Stone webhook + admin.

**Body:**

```json
{
  "email": "cliente@email.com",
  "audioterapia": true,
  "pdf": true,
  "livro_digital": false
}
```

---

### Upload admin (R2)

```
POST /api/uploads/presign
```

**Auth:** `admin`

**Body:**

```json
{
  "filename": "capa.jpg",
  "contentType": "image/jpeg",
  "folder": "catalog/covers"
}
```

**Resposta:** URL pré-assinada para upload direto ao R2.

---

## 9. Push notifications

### Chave VAPID pública

```
GET /api/push/vapid-public-key
```

**Auth:** `public`

---

### Inscrever / cancelar

```
POST /api/push/subscribe
POST /api/push/unsubscribe
GET  /api/push/subscription-status
```

**Auth:** `session`

**POST subscribe — Body:**

```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

---

### Lembretes (cron)

```
GET /api/push/check-reminders
```

**Auth:** `cron` ou `admin`

---

## 10. Admin

> Todas as rotas abaixo exigem e-mail `@mediz.com` (`requireAdmin()` ou verificação inline).

### Usuários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/users` | Lista usuários |
| POST | `/api/admin/users` | Cria usuário |
| GET | `/api/admin/users/[id]` | Detalhe |
| PATCH | `/api/admin/users/[id]` | Atualiza |
| DELETE | `/api/admin/users/[id]` | Remove |

---

### Catálogo

| Método | Rota | Descrição |
|--------|------|-----------|
| GET, POST | `/api/admin/catalog-products` | Lista/cria produtos |
| PATCH, DELETE | `/api/admin/catalog-products/[id]` | Edita/remove |
| GET, PUT | `/api/admin/catalog-products/[id]/modules` | Lista/salva módulos do curso (VIDEO) |
| POST | `/api/admin/catalog-products/upload` | Upload capa |
| POST | `/api/admin/catalog-products/upload-media` | Upload mídia |
| POST | `/api/admin/catalog-products/upload-audioterapia-package` | Pacote audioterapia |
| GET, POST | `/api/admin/catalog-products/import-media` | Importação em lote |

**PATCH produto — campos relevantes:**

```json
{
  "title": "string",
  "section": "BIBLIOTECA",
  "hotmartProductId": "123456",
  "stoneProductId": "sku-xxx",
  "paymentProvider": "HOTMART",
  "externalHotmartIds": ["111", "222"]
}
```

---

### Biblioteca — credenciais pendentes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/biblioteca/pending-credentials` | Clientes sem credenciais enviadas |
| POST | `/api/admin/biblioteca/pending-credentials/[userId]/regenerate` | Nova senha temporária |
| POST | `/api/admin/biblioteca/pending-credentials/[userId]/mark-sent` | Marca como enviado |

---

### Assinaturas e planos

| Método | Rota |
|--------|------|
| GET, POST, PUT, DELETE | `/api/admin/subscriptions` |
| POST | `/api/admin/subscriptions/recalculate` |
| GET | `/api/admin/plans` |
| GET | `/api/admin/plans/names` |

---

### Métricas e exportação

| Método | Rota |
|--------|------|
| GET | `/api/admin/dashboard-stats` |
| GET | `/api/admin/metrics` |
| GET | `/api/admin/analytics` |
| GET | `/api/admin/user-growth` |
| GET | `/api/admin/symptoms-metrics` |
| GET | `/api/admin/export` |
| POST | `/api/admin/export-sintomas` |

---

### Segurança e auditoria

| Método | Rota |
|--------|------|
| GET | `/api/admin/audit-logs` |
| GET | `/api/admin/audit-logs/export` |
| POST | `/api/admin/audit-logs/login-success` |
| POST | `/api/admin/audit-logs/logout` |
| POST | `/api/admin/audit-logs/login-failed` |
| GET | `/api/admin/security-dashboard` |
| POST | `/api/admin/security-alerts` |

---

### Push admin

| Método | Rota |
|--------|------|
| POST | `/api/admin/push/broadcast` |
| GET | `/api/admin/push/reminders` |
| POST | `/api/admin/push/reset-banner` |

---

### Popup admin

| Método | Rota |
|--------|------|
| GET, POST | `/api/popup` |
| GET, DELETE | `/api/popup/admin` |
| POST | `/api/popup/upload` |

---

## 11. Webhooks externos

### Stripe

```
POST /api/stripe/webhook
```

**Auth:** assinatura `stripe-signature` com `STRIPE_WEBHOOK_SECRET`

**Eventos tratados:** `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

---

### Hotmart

```
POST /api/hotmart
```

**Auth:** header Hottok (`HOTMART_HOTTOK`)

**Funções:**

1. Assinatura meDIZ (`HOTMART_MEDIZ_PRODUCT_ID`) → `Subscription`
2. Produtos de catálogo → `ProductEntitlement` via `grantPurchaseAccess()`
3. Onboarding novo cliente → `N8N_NEW_USER_WEBHOOK_URL`

**Respostas:**

| Status | Significado |
|--------|-------------|
| `200` | Processado |
| `202` | Compra pendente (usuário ainda não cadastrado) |
| `422` | Produto não mapeado no catálogo |

---

### Stone (Pagar.me)

```
POST /api/stone/webhook
GET  /api/stone/webhook
```

**Auth:** público (recomenda-se configurar secret no futuro)

Processa compras de produtos do catálogo por SKU/ID Stone.

---

## 12. Códigos de erro comuns

| Código / campo | HTTP | Significado |
|----------------|------|-------------|
| `Não autenticado` | 401 | Sem sessão válida |
| `PASSWORD_RESET_REQUIRED` | 403 | Usuário deve trocar senha |
| `Forbidden` | 403 | Sem permissão (admin/premium/entitlement) |
| `limitReached` | 403 | Limite diário do plano gratuito (chat) |
| `PDF_DOWNLOAD_QUOTA_EXCEEDED` | 429 | Cota mensal de PDF esgotada |
| `UNMAPPED_CATALOG_PRODUCT` | 422 | ID Hotmart/Stone não cadastrado no admin |
| `INVALID_BODY` | 400 | Validação Zod falhou |
| `DOWNLOAD_REQUEST_FAILED` | 500 | Erro interno no download |

---

## Apêndice: mapa completo de rotas

Total: **107** arquivos `route.ts` em `src/app/api/`.

```
/api/auth/[...nextauth]          /api/auth/signup
/api/auth/change-password        /api/auth/update-whatsapp
/api/confirm-signup              /api/verify-signup
/api/reset-password              /api/request-reset-whatsapp
/api/auth-debug

/api/user                          /api/user/form
/api/user/avatar                   /api/user/sidebar
/api/user/notifications-preference

/api/openai                        /api/openai/messages
/api/openai/messages/user-messages
/api/conversational-chat           /api/conversational-chat/sessions
/api/chat/sessions                 /api/chat/pdf
/api/export-pdf

/api/symptoms                      /api/symptoms/[id]
/api/symptoms/popular              /api/symptoms/global
/api/symptoms/dashboard            /api/symptoms/update-popular
/api/folders                       /api/folders/[id]

/api/plans
/api/stripe/checkout               /api/stripe/subscription
/api/stripe/subscription/cancel    /api/stripe/invoices
/api/stripe/webhook
/api/hotmart                       /api/stone/webhook

/api/catalog/products              /api/catalog/products/[id]
/api/catalog/products/[id]/media
/api/me/library                    /api/me/audioterapia
/api/biblioteca/pdf                /api/biblioteca/livro-digital
/api/biblioteca/audioterapia       /api/audioterapia
/api/library/stream
/api/library/download/request      /api/library/download/file
/api/library/permissions
/api/uploads/presign

/api/push/vapid-public-key         /api/push/subscribe
/api/push/unsubscribe              /api/push/subscription-status
/api/push/send                     /api/push/reminders
/api/push/check-reminders          /api/push/check-reminders-queue

/api/health                        /api/analytics
/api/suggestion                    /api/popup
/api/popup/upload                  /api/popup/admin
/api/ab-testing                    /api/ab-testing/tracking

/api/admin/users                   /api/admin/users/[id]
/api/admin/subscriptions           /api/admin/subscriptions/recalculate
/api/admin/plans                   /api/admin/plans/names
/api/admin/catalog-products        /api/admin/catalog-products/[id]
/api/admin/catalog-products/upload /api/admin/catalog-products/upload-media
/api/admin/catalog-products/upload-audioterapia-package
/api/admin/catalog-products/import-media
/api/admin/biblioteca/pending-credentials
/api/admin/biblioteca/pending-credentials/[userId]/regenerate
/api/admin/biblioteca/pending-credentials/[userId]/mark-sent
/api/admin/dashboard-stats         /api/admin/metrics
/api/admin/analytics               /api/admin/user-growth
/api/admin/symptoms-metrics        /api/admin/export
/api/admin/export-sintomas         /api/admin/reset-password
/api/admin/requests                /api/admin/request-access
/api/admin/audit-logs              /api/admin/audit-logs/export
/api/admin/audit-logs/login-success /api/admin/audit-logs/logout
/api/admin/audit-logs/login-failed
/api/admin/security-dashboard      /api/admin/security-alerts
/api/admin/security-alerts/history /api/admin/log-rotation
/api/admin/push/broadcast          /api/admin/push/reminders
/api/admin/push/reset-banner       /api/admin/push/enable-banner-for-all

/api/test/verification-token       (apenas dev + CYPRESS_TEST_HELPER_KEY)
```

---

*Última atualização: junho de 2026 — branch `newmediz`*

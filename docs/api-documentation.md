# 📚 Documentação da API - meDIZ

## 🎯 Visão Geral

Esta documentação descreve todas as rotas da API REST da plataforma meDIZ, uma aplicação Next.js 15 que oferece consultas de IA para saúde e bem-estar através de chat conversacional.

**Base URL:** `https://mediz.app/api` (produção) ou `http://localhost:3000/api` (desenvolvimento)

**Formato de Resposta:** Todas as respostas são em JSON, exceto downloads de arquivos (CSV, PDF).

---

## 🔐 Autenticação

A plataforma usa **NextAuth v5** com múltiplos provedores:

- **JWT Strategy** - Sessões com duração de 365 dias
- **Credentials Provider** - Login com email e senha (hash bcrypt)
- **Google OAuth** - Login social via Google
- **PrismaAdapter** - Armazena sessões e contas no banco de dados

### Como usar

```typescript
// Server Component
import { auth } from '@/auth'
const session = await auth()

// Client Component
import { signIn, signOut } from 'next-auth/react'
await signIn('credentials', { email, password })
```

### Headers de Autenticação

As requisições autenticadas dependem de cookies HTTP-only gerenciados pelo NextAuth. Não é necessário enviar headers manuais - o navegador envia os cookies automaticamente.

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15.2.4** - Framework React com App Router
- **React 19.0.0** - Biblioteca UI
- **TypeScript 5.8.2** - Tipagem estática
- **Tailwind CSS 3.4.1** - Framework CSS utility-first
- **Framer Motion 12.23.6** - Animações
- **Radix UI** - Componentes acessíveis (Dialog, Dropdown, etc)
- **React Hook Form 7.57.0** - Gerenciamento de formulários
- **Zod 3.25.64** - Validação de schemas
- **Lucide React 0.476.0** - Ícones

### Backend & Database
- **Prisma 6.5.0** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados relacional
- **NextAuth 5.0.0-beta.25** - Autenticação
- **bcryptjs 3.0.2** - Hash de senhas (10 rounds)

### Integrações Externas
- **OpenAI API** - Assistente IA conversacional (Assistants API v2)
- **Stripe 18.3.0** - Processamento de pagamentos
- **Hotmart** - Webhooks de afiliados e assinaturas
- **Cloudinary 2.7.0** - Upload e otimização de imagens
- **html2pdf.js 0.12.1** - Geração de PDFs

### Utilities
- **date-fns 4.1.0** - Manipulação de datas
- **class-variance-authority 0.7.1** - Variantes de componentes
- **tailwind-merge 3.0.2** - Merge de classes Tailwind
- **react-markdown 10.1.0** - Renderização de Markdown

---

## 📋 Estrutura da API

### Organização

As rotas seguem a convenção do Next.js App Router:
- Cada arquivo `route.ts` exporta funções nomeadas (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- Rotas dinâmicas usam `[id]` ou `[...nextauth]` (catch-all)
- Autenticação é verificada em cada endpoint quando necessário

---

## 🔑 Endpoints de Autenticação

### `POST /api/auth/[...nextauth]`

Rota catch-all do NextAuth que gerencia todas as operações de autenticação.

**Endpoints gerados:**
- `GET /api/auth/signin` - Página de login
- `POST /api/auth/signin/:provider` - Iniciar login com provedor
- `POST /api/auth/signout` - Fazer logout
- `GET /api/auth/session` - Obter sessão atual
- `GET /api/auth/csrf` - Obter CSRF token
- `GET /api/auth/providers` - Listar provedores disponíveis
- `GET /api/auth/callback/:provider` - Callback OAuth

**Provedores disponíveis:**
- `credentials` - Email e senha
- `google` - Google OAuth

---

### `POST /api/auth/signup`

Criar novo usuário com email e senha.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "password": "senhaSegura123",
  "name": "Nome do Usuário"
}
```

**Response (201):**
```json
{
  "success": true,
  "userId": "uuid-do-usuario"
}
```

**Erros:**
- `400` - Email já existe ou dados inválidos
- `500` - Erro interno do servidor

---

### `POST /api/auth/update-whatsapp`

Atualizar número de WhatsApp do usuário autenticado.

**Request Body:**
```json
{
  "whatsapp": "+5511999999999"
}
```

**Response (200):**
```json
{
  "success": true,
  "whatsapp": "+5511999999999"
}
```

**Autenticação:** Obrigatória

---

## 👤 Endpoints de Usuário

### `GET /api/user`

Obter dados completos do usuário autenticado.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Nome",
  "email": "usuario@example.com",
  "fullName": "Nome Completo",
  "whatsapp": "+5511999999999",
  "age": 30,
  "gender": "MALE",
  "profession": "Terapeuta",
  "appUsage": "PROFESSIONAL",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "subscriptions": [...]
}
```

**Autenticação:** Obrigatória

---

### `GET /api/user/sidebar`

Endpoint otimizado para carregar apenas dados necessários da sidebar (performance).

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Nome",
  "email": "usuario@example.com",
  "image": "url-da-imagem"
}
```

**Autenticação:** Obrigatória

**Performance:** Busca apenas campos essenciais, reduzindo tempo de carregamento.

---

### `PUT /api/user/form`

Atualizar dados do formulário do usuário.

**Request Body:**
```json
{
  "fullName": "Nome Completo",
  "age": 30,
  "gender": "MALE",
  "profession": "Profissão",
  "appUsage": "PERSONAL",
  "description": "Descrição",
  "whatsapp": "+5511999999999",
  "educationOrSpecialty": "Especialidade",
  "yearsOfExperience": "5",
  "clientsPerWeek": "10",
  "averageSessionPrice": "100"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { ... }
}
```

**Autenticação:** Obrigatória

---

### `POST /api/user/avatar`

Upload de avatar do usuário (Cloudinary).

**Request:** `multipart/form-data`
- `file`: Arquivo de imagem (JPEG, PNG, WebP)
- Máximo: 5MB

**Response (200):**
```json
{
  "success": true,
  "imageUrl": "https://cloudinary.com/..."
}
```

**Autenticação:** Obrigatória

---

## 💬 Endpoints de Chat

### `POST /api/openai`

Enviar mensagem ao assistente IA e receber resposta.

**Request Body:**
```json
{
  "message": "Dores de cabeça frequentes"
}
```

**Response (200):**
```json
{
  "responses": {
    "assistant": [
      "Resposta do assistente em markdown..."
    ]
  },
  "threadId": "thread_abc123",
  "userPeriod": "first_8_days",
  "fullVisualization": false,
  "shouldShowPopup": false
}
```

**Erros:**
- `401` - Não autenticado
- `403` - Limite de buscas atingido (plano gratuito)
- `500` - Erro na API OpenAI

**Limites:**
- **Plano Gratuito:** 
  - Primeiros 8 dias: 3 buscas/dia
  - Dias 9-30: 1 busca/dia
- **Plano Premium:** Ilimitado

**Autenticação:** Obrigatória

---

### `GET /api/chat/sessions`

Listar sessões de chat do usuário.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "threadId": "thread_abc123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "favorite": false
  }
]
```

**Autenticação:** Obrigatória

---

## 📁 Endpoints de Pastas e Sintomas

### `GET /api/folders`

Listar todas as pastas de sintomas do usuário.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Nome da Pasta",
    "color": "#4f46e5",
    "notes": "Notas da pasta",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "symptoms": [
      {
        "id": "uuid",
        "symptom": "Dor de cabeça",
        "threadId": "thread_abc123"
      }
    ]
  }
]
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `POST /api/folders`

Criar nova pasta de sintomas.

**Request Body:**
```json
{
  "name": "Nome da Pasta",
  "color": "#4f46e5",
  "notes": "Notas opcionais"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Nome da Pasta",
  "color": "#4f46e5",
  "notes": "Notas opcionais",
  "userId": "uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `PATCH /api/folders/[id]`

Atualizar pasta de sintomas.

**Request Body:**
```json
{
  "name": "Novo Nome",
  "color": "#10b981",
  "notes": "Novas notas"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Novo Nome",
  ...
}
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `DELETE /api/folders/[id]`

Excluir pasta de sintomas.

**Response (200):**
```json
{
  "success": true
}
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `POST /api/symptoms`

Salvar sintoma em uma pasta.

**Request Body:**
```json
{
  "folderId": "uuid-da-pasta",
  "symptom": "Dor de cabeça frequente",
  "threadId": "thread_abc123"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "folderId": "uuid-da-pasta",
  "symptom": "Dor de cabeça frequente",
  "threadId": "thread_abc123",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `DELETE /api/symptoms/[id]`

Excluir sintoma salvo.

**Response (200):**
```json
{
  "success": true
}
```

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

### `GET /api/symptoms/popular`

Obter lista de sintomas mais pesquisados (cache).

**Response (200):**
```json
{
  "symptoms": [
    {
      "symptom": "Dor de cabeça",
      "count": 150,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  ],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```

**Autenticação:** Opcional

---

### `POST /api/symptoms/update-popular`

Atualizar estatísticas de sintomas populares (admin apenas).

**Autenticação:** Obrigatória (admin)

---

## 💳 Endpoints de Assinaturas e Pagamentos

### `GET /api/plans`

Listar planos disponíveis.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Assinatura mensal hotmart",
    "stripePriceId": "price_hotmart_mensal",
    "interval": "MONTH",
    "amount": 3990,
    "currency": "brl",
    "active": true
  },
  {
    "id": "uuid",
    "name": "Assinatura anual hotmart",
    "stripePriceId": "price_hotmart_anual",
    "interval": "YEAR",
    "amount": 35880,
    "currency": "brl",
    "active": true
  }
]
```

**Autenticação:** Opcional

---

### `POST /api/stripe/checkout`

Criar sessão de checkout do Stripe.

**Request Body:**
```json
{
  "priceId": "price_hotmart_mensal"
}
```

**Response (200):**
```json
{
  "sessionId": "cs_test_abc123",
  "url": "https://checkout.stripe.com/..."
}
```

**Autenticação:** Obrigatória

---

### `GET /api/stripe/subscription`

Obter assinatura ativa do usuário.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "active",
  "plan": {
    "name": "Assinatura mensal hotmart",
    "interval": "MONTH"
  },
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z"
}
```

**Autenticação:** Obrigatória

---

### `POST /api/stripe/subscription/cancel`

Cancelar assinatura ativa.

**Response (200):**
```json
{
  "success": true,
  "subscription": {
    "status": "cancel_at_period_end"
  }
}
```

**Autenticação:** Obrigatória

---

### `GET /api/stripe/invoices`

Listar faturas do usuário.

**Response (200):**
```json
[
  {
    "id": "inv_abc123",
    "amount": 3990,
    "status": "paid",
    "created": 1704067200
  }
]
```

**Autenticação:** Obrigatória

---

### `POST /api/stripe/webhook`

Webhook do Stripe para eventos de pagamento (processado automaticamente).

**Nota:** Não deve ser chamado manualmente - Stripe chama automaticamente.

---

### `POST /api/hotmart`

Webhook da Hotmart para eventos de assinatura (processado automaticamente).

**Payload exemplo:**
```json
{
  "event": "PURCHASE_APPROVED",
  "data": {
    "purchase": {
      "transaction": "transaction_id",
      "offer": { "code": "jcuheq2m" },
      "price": { "value": 39.90 },
      "status": "APPROVED"
    },
    "buyer": {
      "email": "comprador@example.com",
      "name": "Nome do Comprador"
    },
    "subscription": {
      "plan": {
        "name": "Plano Mensal",
        "id": "plan_id"
      }
    }
  }
}
```

**Response (200):**
```json
{
  "received": true,
  "success": true,
  "subscriptionId": "uuid"
}
```

**Nota:** Não deve ser chamado manualmente - Hotmart chama automaticamente.

**Processamento:**
- Identifica periodicidade (mensal/anual) pelo `subscription.plan.name`
- Busca plano correspondente (`price_hotmart_mensal` ou `price_hotmart_anual`)
- Cria/atualiza assinatura no banco
- Processa cancelamentos via `PURCHASE_CANCELLED` ou `SUBSCRIPTION_CANCELLATION`

---

## 📊 Endpoints de Admin

Todos os endpoints de admin exigem autenticação com email terminando em `@mediz.com`.

### `GET /api/admin/dashboard-stats`

Estatísticas do dashboard administrativo.

**Response (200):**
```json
{
  "totalUsers": 1000,
  "premiumUsers": 250,
  "freeUsers": 750,
  "activeUsers": 800,
  "totalSubscriptions": 250,
  "activeSubscriptions": 245,
  "totalChatSessions": 5000,
  "pendingAdminRequests": 5,
  "conversionRate": 0.25,
  "recentAuditLogs": [...]
}
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/users`

Listar usuários com paginação e filtros.

**Query Parameters:**
- `page` (opcional) - Página (padrão: 1)
- `limit` (opcional) - Itens por página (padrão: 50)
- `search` (opcional) - Busca por nome/email
- `plan` (opcional) - Filtro: `all`, `free`, `premium`
- `role` (opcional) - Filtro: `all`, `admin`, `user`

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Nome",
      "email": "usuario@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "subscriptionDetails": {
        "planName": "Assinatura mensal hotmart",
        "planInterval": "MONTH",
        "status": "active",
        "currentPeriodEnd": "2024-02-01T00:00:00.000Z"
      }
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 50,
    "totalPages": 20
  }
}
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/users/[id]`

Obter detalhes de um usuário específico.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Nome",
  "email": "usuario@example.com",
  "isAdmin": false,
  "plan": "premium",
  "subscriptions": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Autenticação:** Obrigatória (admin)

---

### `PATCH /api/admin/users/[id]`

Atualizar dados de um usuário (admin).

**Request Body:**
```json
{
  "name": "Novo Nome",
  "email": "novo@example.com",
  "isAdmin": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { ... }
}
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/users`

Criar novo usuário (admin).

**Request Body:**
```json
{
  "email": "novo@example.com",
  "password": "senhaSegura123",
  "name": "Nome do Usuário",
  "isAdmin": false
}
```

**Response (201):**
```json
{
  "success": true,
  "userId": "uuid"
}
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/plans`

Listar planos (apenas os 2 válidos: mensal e anual).

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Assinatura mensal hotmart",
    "stripePriceId": "price_hotmart_mensal",
    "interval": "MONTH",
    "active": true
  },
  {
    "id": "uuid",
    "name": "Assinatura anual hotmart",
    "stripePriceId": "price_hotmart_anual",
    "interval": "YEAR",
    "active": true
  }
]
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/subscriptions`

Listar todas as assinaturas.

**Query Parameters:**
- `status` (opcional) - Filtrar por status
- `page` (opcional) - Paginação

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "plan": {
      "name": "Assinatura mensal hotmart",
      "interval": "MONTH"
    },
    "status": "active",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z"
  }
]
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/user-growth`

Estatísticas de crescimento de usuários.

**Query Parameters:**
- `startDate` (opcional) - Data inicial (ISO string)
- `endDate` (opcional) - Data final (ISO string)

**Response (200):**
```json
{
  "total": 1000,
  "growth": [
    {
      "date": "2024-01-01",
      "newUsers": 10,
      "cumulative": 1000
    }
  ]
}
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/symptoms-metrics`

Métricas de sintomas mais pesquisados.

**Response (200):**
```json
{
  "totalSearches": 5000,
  "uniqueSymptoms": 500,
  "topSymptoms": [
    {
      "symptom": "Dor de cabeça",
      "count": 150,
      "percentage": 3.0
    }
  ]
}
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/export`

Exportar dados de usuários em CSV.

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "plan": "premium",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

**Response:** Arquivo CSV para download

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/export-sintomas`

Exportar sintomas pesquisados em CSV.

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Response:** Arquivo CSV para download

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/audit-logs`

Listar logs de auditoria.

**Query Parameters:**
- `action` (opcional) - Filtrar por ação
- `userId` (opcional) - Filtrar por usuário
- `page` (opcional) - Paginação

**Response (200):**
```json
[
  {
    "id": "uuid",
    "action": "USER_LOGIN",
    "userId": "uuid",
    "userEmail": "usuario@example.com",
    "metadata": {},
    "ipAddress": "192.168.1.1",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
]
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/audit-logs/login-success`

Registrar login bem-sucedido.

**Request Body:**
```json
{
  "userId": "uuid",
  "email": "usuario@example.com",
  "ipAddress": "192.168.1.1"
}
```

**Response (201):**
```json
{
  "success": true
}
```

**Autenticação:** Não requerida (chamado internamente)

---

### `POST /api/admin/audit-logs/login-failed`

Registrar tentativa de login falhada.

**Request Body:**
```json
{
  "email": "usuario@example.com",
  "ipAddress": "192.168.1.1",
  "reason": "Invalid credentials"
}
```

**Response (201):**
```json
{
  "success": true
}
```

**Autenticação:** Não requerida (chamado internamente)

---

### `GET /api/admin/security-alerts`

Listar alertas de segurança.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "type": "MULTIPLE_FAILED_LOGINS",
    "severity": "high",
    "description": "5 tentativas de login falhadas",
    "ipAddress": "192.168.1.1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/security-alerts`

Criar alerta de segurança.

**Request Body:**
```json
{
  "type": "MULTIPLE_FAILED_LOGINS",
  "severity": "high",
  "description": "Descrição do alerta",
  "ipAddress": "192.168.1.1"
}
```

**Response (201):**
```json
{
  "success": true,
  "alert": { ... }
}
```

**Autenticação:** Obrigatória (admin)

---

### `GET /api/admin/analytics`

Estatísticas avançadas de analytics.

**Response (200):**
```json
{
  "userEngagement": {
    "dailyActiveUsers": 800,
    "weeklyActiveUsers": 2000,
    "monthlyActiveUsers": 5000
  },
  "revenue": {
    "monthly": 50000,
    "annual": 600000
  }
}
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/admin/reset-password`

Resetar senha de um usuário (admin).

**Request Body:**
```json
{
  "userId": "uuid",
  "newPassword": "novaSenhaSegura123"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Autenticação:** Obrigatória (admin)

---

## 📄 Endpoints de PDF

### `POST /api/export-pdf`

Gerar PDF da consulta (premium apenas).

**Request Body:**
```json
{
  "question": "Dor de cabeça frequente",
  "answer": "Resposta em markdown...",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "patientName": "Nome do Paciente",
  "therapistName": "Nome do Terapeuta"
}
```

**Response:** Download do PDF

**Autenticação:** Obrigatória

**Premium:** Funcionalidade disponível apenas para usuários premium

---

## 🔔 Endpoints de Popup

### `GET /api/popup`

Obter configuração do popup promocional ativo.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Título do Popup",
  "content": "Conteúdo em HTML",
  "imageUrl": "https://cloudinary.com/...",
  "status": "ACTIVE",
  "buttonText": "Assinar Agora"
}
```

**Autenticação:** Opcional

---

### `POST /api/popup/admin`

Criar/atualizar popup promocional (admin).

**Request Body:**
```json
{
  "title": "Título",
  "content": "Conteúdo HTML",
  "imageUrl": "https://...",
  "status": "ACTIVE",
  "buttonText": "Texto do Botão"
}
```

**Response (200):**
```json
{
  "success": true,
  "popup": { ... }
}
```

**Autenticação:** Obrigatória (admin)

---

### `POST /api/popup/upload`

Upload de imagem para popup (admin).

**Request:** `multipart/form-data`
- `image`: Arquivo de imagem

**Response (200):**
```json
{
  "success": true,
  "imageUrl": "https://cloudinary.com/..."
}
```

**Autenticação:** Obrigatória (admin)

---

## 🔄 Endpoints de Reset e Verificação

### `POST /api/reset-password`

Solicitar reset de senha via email.

**Request Body:**
```json
{
  "email": "usuario@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email de reset enviado"
}
```

---

### `POST /api/verify-signup`

Verificar conta após cadastro.

**Request Body:**
```json
{
  "token": "token-de-verificacao"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### `POST /api/confirm-signup`

Confirmar cadastro.

**Request Body:**
```json
{
  "token": "token-de-confirmacao"
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## 📈 Endpoints de Analytics

### `POST /api/analytics`

Registrar evento de analytics.

**Request Body:**
```json
{
  "event": "page_view",
  "properties": {
    "page": "/chat"
  }
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Autenticação:** Opcional

---

## 🧪 Endpoints de Debug

### `GET /api/auth-debug`

Endpoint de debug para verificar estado de autenticação (desenvolvimento apenas).

**Response (200):**
```json
{
  "session": { ... },
  "isAuthenticated": true,
  "isAdmin": false
}
```

---

## 🔧 Configurações e Variáveis de Ambiente

### Variáveis Necessárias

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_SECRET="secret-key-aqui"
NEXTAUTH_URL="https://mediz.app" # ou http://localhost:3000 em dev

# Google OAuth
GOOGLE_CLIENT_ID="seu-client-id"
GOOGLE_CLIENT_SECRET="seu-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_ASSISTANT_ID="asst_..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Hotmart
HOTMART_MEDIZ_PRODUCT_ID="product-id"
HOTMART_MONTHLY_PRICE_CODE="price_hotmart_mensal"
HOTMART_YEARLY_PRICE_CODE="price_hotmart_anual"

# Cloudinary
CLOUDINARY_CLOUD_NAME="cloud-name"
CLOUDINARY_API_KEY="api-key"
CLOUDINARY_API_SECRET="api-secret"
```

---

## 📊 Modelos do Banco de Dados

### Principais Modelos (Prisma)

#### User
```prisma
model User {
  id            String        @id @default(uuid())
  name          String?
  email         String        @unique
  passwordHash  String?
  fullName      String?
  whatsapp      String?
  age           Int?
  gender        Gender?
  profession    String?
  appUsage      AppUsage?
  createdAt     DateTime      @default(now())
  subscriptions Subscription[]
  chatSessions  ChatSession[]
  symptomFolders SymptomFolder[]
}
```

#### Subscription
```prisma
model Subscription {
  id                  String   @id @default(uuid())
  userId              String
  planId              String
  stripeSubscriptionId String?  @unique
  status              String
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
  user                User     @relation(...)
  plan                Plan     @relation(...)
}
```

#### Plan
```prisma
model Plan {
  id            String         @id @default(uuid())
  name          String
  stripePriceId String         @unique
  interval      PlanInterval?
  amount        Int?
  currency      String?
  active        Boolean        @default(true)
  subscriptions Subscription[]
}
```

#### ChatSession
```prisma
model ChatSession {
  id        String   @id @default(uuid())
  userId    String
  threadId  String?  @unique
  favorite  Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(...)
}
```

#### SymptomFolder
```prisma
model SymptomFolder {
  id        String        @id @default(uuid())
  userId    String
  name      String
  color     String?
  notes     String?
  createdAt DateTime      @default(now())
  symptoms  SavedSymptom[]
}
```

#### SavedSymptom
```prisma
model SavedSymptom {
  id        String        @id @default(uuid())
  folderId  String
  symptom   String
  threadId  String?
  createdAt DateTime      @default(now())
  folder    SymptomFolder @relation(...)
}
```

---

## 🔒 Segurança

### Autenticação
- Senhas hashadas com **bcryptjs** (10 rounds)
- Tokens JWT com expiração de 365 dias
- Cookies HTTP-only para sessões
- CSRF protection via NextAuth

### Autorização
- Rotas admin verificam email `@mediz.com`
- Verificação de propriedade de recursos (usuário só acessa seus próprios dados)
- Validação de assinaturas premium para funcionalidades específicas

### Validação
- Validação de entrada em todos os endpoints
- Sanitização de dados antes de salvar no banco
- Rate limiting via verificação de limites diários

### Logs e Auditoria
- Sistema de auditoria completo (`AuditLog`)
- Logs de tentativas de login falhadas
- Alertas de segurança para padrões suspeitos

---

## 🚀 Performance

### Otimizações Implementadas

1. **Cache Global de Usuário** - Cache em memória para dados da sidebar
2. **Queries Otimizadas** - Busca apenas campos necessários
3. **Lazy Loading** - Carregamento sob demanda de componentes
4. **Image Optimization** - Cloudinary para otimização automática de imagens
5. **Database Indexing** - Índices em campos frequentemente consultados

---

## 📝 Notas de Desenvolvimento

### Convenções

- **Nomenclatura:** camelCase para variáveis, PascalCase para componentes
- **Imports:** Sempre usar caminhos absolutos com `@/`
- **TypeScript:** Strict mode desabilitado, mas tipagem recomendada
- **Error Handling:** Sempre retornar `NextResponse.json()` com status apropriado

### Testes

O projeto inclui vários scripts de teste em `src/scripts/`:
- `test-api-response.ts` - Testar respostas da API
- `test-subscriptions.ts` - Validar assinaturas
- `test-user-periods.ts` - Testar períodos de usuário

---

## 🔗 Referências

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [NextAuth v5 Documentation](https://authjs.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants)
- [Stripe API](https://stripe.com/docs/api)

---

**Última atualização:** Janeiro 2025  
**Versão da API:** 1.0.0


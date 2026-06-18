# 📡 URLs de API - meDIZ

> **Documentação atualizada:** use [DOCUMENTACAO-API.md](./DOCUMENTACAO-API.md) e [DOCUMENTACAO-TECNICA.md](./DOCUMENTACAO-TECNICA.md).  
> Este arquivo é legado e pode estar desatualizado.

Documentação completa de todos os endpoints da aplicação.

**Base URL:**
- **Desenvolvimento:** `http://localhost:3000`
- **Produção:** `https://exemplo-app.vercel.app` (ou seu domínio customizado)

---

## 🔐 Autenticação

### NextAuth (Autenticação Principal)
```
GET/POST /api/auth/[...nextauth]
```
- Login, logout, sessões
- Suporta Google OAuth e Credentials

### Cadastro e Verificação
```
POST /api/auth/signup
```
- Cria novo usuário

```
POST /api/confirm-signup
```
- Confirma cadastro via token

```
GET /api/verify-signup
```
- Verifica status de confirmação

```
POST /api/auth/update-whatsapp
```
- Atualiza WhatsApp do usuário

### Debug de Autenticação
```
GET /api/auth-debug
```
- Retorna informações da sessão atual (debug)

---

## 💬 Chat e OpenAI

### Pesquisas no Chat
```
POST /api/openai
```
- **Endpoint principal para pesquisas**
- Envia mensagem ao Assistant OpenAI
- Body: `{ message: string }`
- Retorna: `{ responses: string[], threadId: string }`

### Mensagens
```
GET /api/openai/messages?threadId={threadId}
```
- Busca mensagens de uma thread específica

```
GET /api/openai/messages/user-messages
```
- Busca mensagens do usuário atual

### Sessões de Chat
```
GET /api/chat/sessions
```
- Lista sessões de chat do usuário

---

## 👤 Usuário

### Perfil do Usuário
```
GET /api/user
```
- Busca dados do usuário logado

```
POST /api/user
```
- Atualiza dados do usuário

### Formulário
```
GET /api/user/form
```
- Busca dados do formulário do usuário

```
POST /api/user/form
```
- Salva dados do formulário

### Avatar
```
POST /api/user/avatar
```
- Upload de avatar

### Sidebar
```
GET /api/user/sidebar
```
- Dados para sidebar (nome, avatar, etc)

---

## 🏥 Sintomas

### Listar Sintomas
```
GET /api/symptoms
```
- Lista todos os sintomas

### Sintoma Específico
```
GET /api/symptoms/[id]
```
- Busca sintoma por ID

### Sintomas Populares
```
GET /api/symptoms/popular
```
- Lista sintomas mais pesquisados

### Atualizar Popularidade
```
POST /api/symptoms/update-popular
```
- Atualiza contador de popularidade (admin)

---

## 💳 Pagamentos (Stripe)

### Checkout
```
POST /api/stripe/checkout
```
- Cria sessão de checkout

### Assinaturas
```
GET /api/stripe/subscription
```
- Busca assinatura do usuário

```
POST /api/stripe/subscription
```
- Cria/atualiza assinatura

```
POST /api/stripe/subscription/cancel
```
- Cancela assinatura

### Faturas
```
GET /api/stripe/invoices
```
- Lista faturas do usuário

### Webhook
```
POST /api/stripe/webhook
```
- Webhook do Stripe (eventos de pagamento)

---

## 📦 Planos

```
GET /api/plans
```
- Lista planos disponíveis

---

## 🔔 Plataforma de Pagamento (Webhooks)

```
POST /api/hotmart
```
- Webhook da plataforma de pagamento para eventos de afiliados

---

## 📁 Pastas de Sintomas

```
GET /api/folders
```
- Lista pastas do usuário

```
POST /api/folders
```
- Cria nova pasta

```
GET /api/folders/[id]
```
- Busca pasta específica

```
PUT /api/folders/[id]
```
- Atualiza pasta

```
DELETE /api/folders/[id]
```
- Deleta pasta

---

## 📊 Analytics

```
GET /api/analytics
```
- Dados de analytics do usuário

---

## 🔒 Redefinição de Senha

```
POST /api/request-reset-whatsapp
```
- Solicita redefinição via WhatsApp

```
POST /api/reset-password
```
- Redefine senha com token

---

## 📄 Exportação

```
GET /api/export-pdf
```
- Exporta conversa em PDF

---

## 🎨 Popup Promocional

```
GET /api/popup
```
- Busca popup ativo

```
POST /api/popup/admin
```
- Gerencia popup (admin)

```
POST /api/popup/upload
```
- Upload de imagem do popup

---

## 🧪 A/B Testing

```
GET /api/ab-testing
```
- Configurações de A/B testing

```
POST /api/ab-testing/tracking
```
- Tracking de eventos A/B

---

## 🔐 Admin - Autenticação e Logs

### Auditoria
```
GET /api/admin/audit-logs
```
- Lista logs de auditoria

```
GET /api/admin/audit-logs/export
```
- Exporta logs de auditoria

### Login/Logout
```
POST /api/admin/audit-logs/login-failed
```
- Registra tentativa de login falhada

```
POST /api/admin/audit-logs/login-success
```
- Registra login bem-sucedido

```
POST /api/admin/audit-logs/logout
```
- Registra logout

---

## 👥 Admin - Usuários

```
GET /api/admin/users
```
- Lista todos os usuários

```
GET /api/admin/users/[id]
```
- Busca usuário específico

```
PUT /api/admin/users/[id]
```
- Atualiza usuário

```
DELETE /api/admin/users/[id]
```
- Deleta usuário

### Redefinição de Senha (Admin)
```
POST /api/admin/reset-password
```
- Admin redefine senha de usuário

---

## 📊 Admin - Analytics e Estatísticas

```
GET /api/admin/analytics
```
- Analytics gerais

```
GET /api/admin/dashboard-stats
```
- Estatísticas do dashboard

```
GET /api/admin/user-growth
```
- Crescimento de usuários

```
GET /api/admin/symptoms-metrics
```
- Métricas de sintomas

---

## 🔐 Admin - Segurança

### Alertas de Segurança
```
POST /api/admin/security-alerts
```
- Envia alerta de segurança via WhatsApp

```
GET /api/admin/security-alerts/history
```
- Histórico de alertas

### Dashboard de Segurança
```
GET /api/admin/security-dashboard
```
- Métricas de segurança em tempo real

### Rotação de Logs
```
GET /api/admin/log-rotation
```
- Estatísticas de logs

```
POST /api/admin/log-rotation
```
- Executa rotação de logs

---

## 📤 Admin - Exportações

```
GET /api/admin/export?type=users&format=csv
```
- Exporta dados (usuários ou analytics)

```
GET /api/admin/export-sintomas
```
- Exporta sintomas mais pesquisados

---

## 📦 Admin - Planos e Assinaturas

```
GET /api/admin/plans
```
- Gerencia planos

```
GET /api/admin/subscriptions
```
- Gerencia assinaturas

---

## 🔑 Admin - Solicitações de Acesso

```
POST /api/admin/request-access
```
- Solicita acesso de admin

```
GET /api/admin/requests
```
- Lista solicitações pendentes

```
PUT /api/admin/requests
```
- Aprova/rejeita solicitação

---

## 📝 Notas Importantes

### Autenticação
- Endpoints de **Admin** (`/api/admin/*`) requerem:
  - Sessão autenticada
  - Email terminando em `@exemplo.com` OU campo `isAdmin: true`

- Endpoints de **Usuário** requerem:
  - Sessão autenticada (NextAuth)

### Rate Limiting
- Endpoints de autenticação têm rate limiting: **10 requisições/minuto por email**

### Bloqueio por IP
- IPs bloqueados após **5 tentativas falhadas** de login
- Bloqueio dura **15 minutos**

### Métodos HTTP
- **GET**: Buscar dados
- **POST**: Criar/enviar dados
- **PUT**: Atualizar dados completos
- **DELETE**: Deletar dados

### Formato de Resposta
- **Sucesso:** `{ success: true, data: ... }`
- **Erro:** `{ error: "mensagem", ... }`

---

**Total de Endpoints:** ~58 rotas de API


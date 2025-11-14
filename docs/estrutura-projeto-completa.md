# 📁 Estrutura Completa do Projeto ExemploApp

## 🎯 Visão Geral
O ExemploApp é uma plataforma de IA para saúde e bem-estar que conecta usuários a profissionais de saúde através de chat conversacional. Esta documentação explica cada pasta e arquivo do projeto.

---

## 📂 Estrutura de Pastas Principais

### **🔧 Configuração e Build**
```
├── .github/workflows/     # CI/CD e automação
├── docs/                  # Documentação do projeto
├── prisma/               # Banco de dados e migrações
├── public/               # Assets estáticos
├── scripts/              # Scripts de desenvolvimento
└── src/                  # Código fonte da aplicação
```

---

## 📋 Detalhamento por Pasta

### **🔧 `.github/workflows/`**
**Propósito:** Automação e CI/CD
- `ci-cd.yml` - Pipeline de integração contínua
  - Verifica TypeScript, ESLint, Prisma
  - Executa build de teste
  - Garante qualidade antes do deploy

### **📚 `docs/`**
**Propósito:** Documentação técnica e funcional
- `acesso-painel-admin.md` - Como acessar painel administrativo
- `admin-users-analytics-export.md` - Exportação de dados de usuários
- `ci-cd-pipeline.md` - Documentação do pipeline CI/CD
- `configuracao-variaveis-ambiente.md` - Configuração de variáveis
- `cron-job-sintomas.md` - Jobs automáticos para sintomas
- `env-sintomas-example.md` - Exemplo de configuração
- `inicio-rapido-admin.md` - Guia rápido para admins
- `otimizacao-performance-sidebar.md` - Otimizações de performance
- `painel-admin-completo.md` - Documentação completa do painel
- `plano-gratuito-regras-uso.md` - Regras do plano gratuito
- `sistema-auditoria-logs.md` - Sistema de auditoria
- `sistema-whatsapp.md` - Integração com WhatsApp

### **🗄️ `prisma/`**
**Propósito:** Banco de dados e migrações
- `schema.prisma` - Schema do banco de dados
  - Modelos: User, Subscription, ChatSession, Account, Session
  - Relacionamentos entre entidades
  - Configurações do Prisma
- `migrations/` - Histórico de mudanças no banco
  - Cada pasta representa uma migração
  - Contém SQL para aplicar mudanças
  - `migration_lock.toml` - Lock para evitar conflitos

### **🌐 `public/`**
**Propósito:** Assets estáticos acessíveis publicamente
- `imgs/` - Imagens da aplicação
  - `logo.png`, `logo.svg` - Logotipos
  - `logo192.png`, `logo512.png` - Ícones PWA
  - `mini-logo.svg` - Logo compacto
- `uploads/popup/` - Imagens de popup carregadas
- `*.svg` - Ícones SVG (file, globe, next, vercel, window)

### **⚙️ `scripts/`**
**Propósito:** Scripts de desenvolvimento e manutenção
- `pre-deploy-check.js` - Verificações antes do deploy
- `setup-cicd.js` - Configuração do CI/CD

### **💻 `src/`**
**Propósito:** Código fonte principal da aplicação

---

## 🏗️ Estrutura Detalhada do `src/`

### **📱 `src/app/` - App Router (Next.js 15)**
**Propósito:** Páginas e rotas da aplicação

#### **🔐 Autenticação**
- `login/page.tsx` - Página de login
- `signup/page.tsx` - Página de cadastro
- `admin-login/page.tsx` - Login específico para admins
- `confirm-signup/page.tsx` - Confirmação de cadastro
- `verify-whatsapp/page.tsx` - Verificação de WhatsApp
- `reset/` - Reset de senha

#### **👤 Usuário**
- `account/page.tsx` - Conta do usuário
- `myAccount/` - Minha conta (dados pessoais)
- `form/page.tsx` - Formulário de dados
- `request-admin/page.tsx` - Solicitação de acesso admin

#### **💬 Chat**
- `chat/` - Interface de chat com IA
  - Interface principal de conversação
  - Histórico de conversas
  - Integração com OpenAI

#### **👨‍💼 Admin**
- `admin/` - Painel administrativo completo
  - Dashboard com métricas
  - Gerenciamento de usuários
  - Analytics e relatórios
  - Configurações do sistema

#### **💰 Assinatura**
- `assinatura-plus/page.tsx` - Página de upgrade
- `success/page.tsx` - Confirmação de pagamento

#### **🔧 Utilitários**
- `install/page.tsx` - Página de instalação
- `2fa-verification/` - Verificação 2FA
- `auth/error/page.tsx` - Página de erro de auth

### **🔌 `src/app/api/` - API Routes**
**Propósito:** Endpoints da API REST

#### **🔐 Autenticação (`auth/`)**
- `[...nextauth]/route.ts` - NextAuth v5 handler
- `signup/route.ts` - Cadastro de usuários
- `update-whatsapp/route.ts` - Atualização WhatsApp

#### **👨‍💼 Admin (`admin/`)**
- `dashboard-stats/route.ts` - Estatísticas do dashboard
- `users/route.ts` - CRUD de usuários
- `users/[id]/route.ts` - Usuário específico
- `subscriptions/route.ts` - Gerenciamento de assinaturas
- `plans/route.ts` - Planos de assinatura
- `analytics/route.ts` - Analytics avançados
- `export/route.ts` - Exportação de dados
- `audit-logs/route.ts` - Logs de auditoria
- `security-alerts/route.ts` - Alertas de segurança
- `2fa/` - Autenticação 2FA para admins

#### **💬 Chat (`chat/`)**
- `sessions/route.ts` - Sessões de chat

#### **🤖 IA (`openai/`)**
- `route.ts` - Endpoint principal da IA
- `messages/route.ts` - Mensagens do chat
- `messages/user-messages/route.ts` - Mensagens do usuário

#### **💳 Pagamentos (`stripe/`)**
- `checkout/route.ts` - Processo de checkout
- `subscription/route.ts` - Gerenciamento de assinatura
- `subscription/cancel/route.ts` - Cancelamento
- `webhook/route.ts` - Webhooks do Stripe
- `invoices/route.ts` - Faturas

#### **📊 Analytics**
- `analytics/route.ts` - Analytics gerais
- `ab-testing/route.ts` - Testes A/B
- `ab-testing/tracking/route.ts` - Tracking de testes

#### **👤 Usuário (`user/`)**
- `route.ts` - Dados do usuário
- `form/route.ts` - Formulário de dados
- `avatar/route.ts` - Avatar do usuário
- `sidebar/route.ts` - Configurações da sidebar

#### **🔔 Popup (`popup/`)**
- `route.ts` - Configuração de popups
- `admin/route.ts` - Admin de popups
- `upload/route.ts` - Upload de imagens

#### **🏥 Sintomas (`symptoms/`)**
- `popular/route.ts` - Sintomas populares
- `update-popular/route.ts` - Atualização de popularidade

#### **🔗 Integrações**
- `plataforma-pagamento/route.ts` - Webhook PlataformaPagamento
- `plans/route.ts` - Planos de assinatura

### **🧩 `src/components/` - Componentes React**
**Propósito:** Componentes reutilizáveis

#### **👨‍💼 Admin (`admin/`)**
- Componentes específicos do painel admin
- Tabelas, gráficos, formulários administrativos

#### **📝 Formulários (`form/`)**
- Componentes de formulário reutilizáveis
- Validação e campos customizados

#### **🎨 UI (`ui/`)**
- Componentes base (shadcn/ui)
- Botões, inputs, modais, etc.

#### **🔧 Utilitários**
- `app-sidebar.tsx` - Sidebar principal
- `login-form.tsx` - Formulário de login
- `register-form.tsx` - Formulário de cadastro
- `SessionProvider.tsx` - Provider de sessão
- `theme-provider.tsx` - Provider de tema
- `mode-toggle.tsx` - Toggle dark/light mode
- `PromotionPopup.tsx` - Popup de promoção
- `BlurredContent.tsx` - Conteúdo desfocado
- `LoadingPlaceholder.tsx` - Placeholder de loading
- `Spinner.tsx` - Spinner de carregamento
- `Footer.tsx` - Rodapé
- `logo.tsx` - Componente de logo

### **🎣 `src/hooks/` - Custom Hooks**
**Propósito:** Lógica reutilizável
- `use-form-data.tsx` - Gerenciamento de formulários
- `use-mobile.tsx` - Detecção de mobile
- `use-session-sync.ts` - Sincronização de sessão
- `use-user-cache.tsx` - Cache de usuário

### **📚 `src/lib/` - Utilitários e Serviços**
**Propósito:** Lógica de negócio e utilitários

#### **🤖 IA e Chat**
- `openai.ts` - Cliente OpenAI
- `assistant.ts` - Lógica do assistente IA
- `chatService.ts` - Serviço de chat
- `parseResponse.ts` - Parser de respostas

#### **👤 Usuário e Auth**
- `premiumUtils.ts` - Utilitários premium
- `userPeriod.ts` - Períodos de usuário
- `auditLogger.ts` - Logger de auditoria

#### **🔧 Utilitários**
- `prisma.ts` - Cliente Prisma
- `utils.ts` - Utilitários gerais
- `formatPhone.ts` - Formatação de telefone
- `sidebarOptions.ts` - Opções da sidebar
- `abTesting.ts` - Testes A/B
- `whatsappService.ts` - Serviço WhatsApp

### **📝 `src/types/` - Definições de Tipos**
**Propósito:** Tipos TypeScript
- `User.ts` - Tipos de usuário
- `next-auth.d.ts` - Extensões NextAuth
- `openaiMessage.ts` - Tipos de mensagens IA
- `plataforma-pagamento.ts` - Tipos PlataformaPagamento

### **🔧 `src/scripts/` - Scripts de Desenvolvimento**
**Propósito:** Scripts auxiliares (33 arquivos)
- Scripts de diagnóstico
- Scripts de configuração
- Scripts de manutenção

### **🌐 `src/contexts/` - Contextos React**
**Propósito:** Estado global
- `user.tsx` - Contexto de usuário

---

## ⚙️ Arquivos de Configuração

### **📦 `package.json`**
**Propósito:** Dependências e scripts
- **Dependências principais:**
  - Next.js 15.2.4 (React framework)
  - React 19.0.0 (UI library)
  - TypeScript 5.8.2 (Type safety)
  - Prisma 6.5.0 (ORM)
  - NextAuth 5.0.0-beta.25 (Auth)
  - Tailwind CSS 3.4.1 (Styling)
  - Framer Motion 12.23.6 (Animations)

### **🔧 Configurações**
- `tsconfig.json` - Configuração TypeScript
- `tailwind.config.ts` - Configuração Tailwind
- `next.config.mjs` - Configuração Next.js
- `postcss.config.mjs` - Configuração PostCSS
- `eslint.config.mjs` - Configuração ESLint
- `vercel.json` - Configuração Vercel
- `components.json` - Configuração shadcn/ui

### **🔐 `src/auth.ts`**
**Propósito:** Configuração NextAuth v5
- Providers (Google OAuth, Credentials)
- Callbacks e eventos
- Configuração de sessão JWT
- Adaptador Prisma

### **🛡️ `src/middleware.ts`**
**Propósito:** Middleware de autenticação
- Proteção de rotas
- Redirecionamentos
- Verificação de sessão

---

## 🗂️ Pastas de Cache e Logs

### **📁 `cache/`**
**Propósito:** Cache de build e dependências

### **📁 `logs/`**
**Propósito:** Logs da aplicação

### **📁 `exports/`**
**Propósito:** Arquivos exportados

### **📁 `node_modules/`**
**Propósito:** Dependências instaladas

---

## 🚀 Fluxo de Desenvolvimento

### **1. Desenvolvimento Local**
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run check:deploy # Verificações pré-deploy
```

### **2. Banco de Dados**
```bash
npx prisma studio    # Interface visual
npx prisma generate  # Gerar cliente
npx prisma migrate   # Aplicar migrações
```

### **3. Deploy**
```bash
npx vercel --prod    # Deploy manual
git push origin main # Deploy automático
```

---

## 📊 Arquitetura da Aplicação

### **Frontend (Next.js 15)**
- **App Router** - Roteamento moderno
- **Server Components** - Renderização no servidor
- **Client Components** - Interatividade no cliente
- **Tailwind CSS** - Estilização utility-first

### **Backend (API Routes)**
- **Next.js API Routes** - Endpoints REST
- **NextAuth v5** - Autenticação
- **Prisma** - ORM e banco de dados
- **OpenAI** - Integração com IA

### **Banco de Dados (PostgreSQL)**
- **Prisma Schema** - Modelagem de dados
- **Migrations** - Versionamento do schema
- **Relacionamentos** - User, Subscription, ChatSession

### **Integrações Externas**
- **Stripe** - Pagamentos
- **Google OAuth** - Login social
- **Cloudinary** - Upload de imagens
- **WhatsApp** - Notificações
- **PlataformaPagamento** - Webhooks de afiliados

---

## 🎯 Principais Funcionalidades

### **👤 Sistema de Usuários**
- Cadastro e login
- Perfis personalizados
- Verificação WhatsApp
- Planos gratuitos e premium

### **💬 Chat com IA**
- Conversação inteligente
- Histórico de sessões
- Respostas contextualizadas
- Integração OpenAI

### **👨‍💼 Painel Admin**
- Dashboard com métricas
- Gerenciamento de usuários
- Analytics avançados
- Sistema de auditoria

### **💰 Sistema de Assinaturas**
- Planos gratuitos e premium
- Pagamentos via Stripe
- Webhooks de confirmação
- Gestão de faturas

### **🔐 Segurança**
- Autenticação robusta
- 2FA para admins
- Logs de auditoria
- Alertas de segurança

---

## 📈 Métricas e Analytics

### **Dashboard Admin**
- Total de usuários
- Usuários premium vs gratuitos
- Assinaturas ativas
- Sessões de chat
- Taxa de conversão

### **Sistema de Logs**
- Logins bem-sucedidos/falhados
- Ações administrativas
- Eventos de segurança
- Auditoria completa

---

## 🔧 Manutenção e Desenvolvimento

### **Scripts Úteis**
- `npm run create-admin` - Criar usuário admin
- `npm run set-admin` - Definir usuário como admin
- Scripts de diagnóstico em `src/scripts/`

### **Monitoramento**
- Logs em `logs/`
- Cache em `cache/`
- Exports em `exports/`

### **Documentação**
- Toda documentação em `docs/`
- README principal
- Guias específicos por funcionalidade

---

## 🎉 Conclusão

O ExemploApp é uma aplicação completa e bem estruturada que combina:
- **Frontend moderno** com Next.js 15
- **Backend robusto** com API Routes
- **Banco de dados** bem modelado com Prisma
- **Integrações** com serviços externos
- **Sistema de autenticação** seguro
- **Painel administrativo** completo
- **Sistema de pagamentos** integrado
- **Chat com IA** avançado

A estrutura modular permite fácil manutenção e expansão de funcionalidades.

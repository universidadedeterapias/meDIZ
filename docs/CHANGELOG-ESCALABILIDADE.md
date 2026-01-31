# Changelog – Melhorias de Escalabilidade (Plano meDIZ)

Resumo das melhorias implementadas com base no [Plano de Escalabilidade e Arquitetura](./plano-escalabilidade-arquitetura.md).  
**Período:** implementações até jan/2026.  
**Fase 5 (Segurança)** foi deixada para depois.

---

## Fase 1 – Correções críticas

### 1.1 Prisma Data Proxy (connection pooling)

- **O que foi feito:** Schema Prisma atualizado para suportar proxy e conexão direta.
  - `prisma/schema.prisma`: `datasource` com `url` (proxy) e `directUrl` (migrations).
- **Benefício:** Menos risco de esgotar conexões no serverless (Vercel); pool gerenciado pelo Prisma.
- **Documentação:** [prisma-data-proxy-passo-a-passo.md](./prisma-data-proxy-passo-a-passo.md), [guia-configuracao-prisma-proxy.md](./guia-configuracao-prisma-proxy.md).

---

### 1.2 Backup automatizado do banco

- **O que foi feito:**
  - Script `scripts/backup-database-weekly.ts`: backup do PostgreSQL (usa `DIRECT_URL` ou `DATABASE_URL`).
  - Workflow `.github/workflows/backup-weekly.yml`: execução semanal (segunda 2h UTC) + execução manual; artefato com retenção de 30 dias.
- **Benefício:** Cópia periódica do banco sem custo extra (artefatos do GitHub); opção futura de enviar para S3.

---

### 1.3 Filas para lembretes (BullMQ)

- **O que foi feito:**
  - **Fila:** `src/lib/queues/reminders-queue.ts` – fila BullMQ `reminders` usando Redis (`REDIS_URL`).
  - **Worker:** `src/lib/workers/reminder-worker.ts` – processa jobs da fila (busca lembrete, envia push, atualiza `lastSentAt`).
  - **Endpoint de lembretes:** `src/app/api/push/check-reminders/route.ts` continua processando **tudo na mesma requisição** (síncrono), para funcionar com o Vercel Cron sem depender de worker externo.
- **Benefício:** Infraestrutura de fila pronta para uso futuro (ex.: worker em servidor separado ou migração para processamento assíncrono). O cron atual segue funcionando como antes (a cada minuto, processamento inline com `maxDuration` 10 min).

---

### 1.4 Redis (connection pooling / serverless)

- **O que foi feito:** `src/lib/redis.ts` atualizado:
  - `lazyConnect`, `enableReadyCheck`, `enableOfflineQueue` adequados a serverless.
  - Retry com backoff, `maxRetriesPerRequest`, `reconnectOnError` para READONLY.
  - `keepAlive`, `connectTimeout` para conexões estáveis.
- **Benefício:** Uso de Redis mais estável na Vercel (e com Upstash em produção).

---

## Fase 2 – Performance e otimizações

### 2.1 Cache em queries pesadas

- **O que foi feito:**
  - `src/lib/cache.ts`: funções genéricas de cache (get, set, delete, invalidate por padrão) com TTL configurável.
  - Cache aplicado em:
    - `src/app/api/symptoms/popular/route.ts` – sintomas populares.
    - `src/app/api/admin/dashboard-stats/route.ts` – estatísticas do dashboard admin.
- **Benefício:** Menos consultas pesadas ao banco; respostas mais rápidas para sintomas populares e dashboard.

---

### 2.2 Retry em APIs externas

- **O que foi feito:**
  - `src/lib/retry.ts`: utilitário de retry com exponential backoff (e opção de circuit breaker).
  - Uso em `src/app/api/openai/route.ts` (webhook n8n / chamadas externas críticas).
- **Benefício:** Menos falhas por instabilidade pontual de serviços externos.

---

### 2.3 Índices de performance

- **O que foi feito:** Migration `prisma/migrations/20260129195250_add_performance_indexes/` com índices no schema Prisma para consultas frequentes.
- **Benefício:** Queries mais rápidas; menor carga no banco ao escalar usuários.

---

## Fase 3 – Monitoramento e observabilidade

### 3.1 Painel de métricas no admin

- **O que foi feito:**
  - API: `src/app/api/admin/metrics/route.ts` – endpoint de métricas (uso de serviços, etc.).
  - Página: `src/app/admin/metrics/page.tsx` – painel no admin.
- **Benefício:** Visibilidade do estado do sistema (DB, Redis, etc.) para quem administra.

---

### 3.2 Health check

- **O que foi feito:** `src/app/api/health/route.ts` – endpoint `/api/health` que verifica conexão com banco e Redis e retorna status (healthy/degraded/unhealthy).
- **Benefício:** Uso por load balancers, monitoramento externo ou dashboards de uptime.

---

### 3.3 Gráfico de assinaturas canceladas (jan/2026)

- **O que foi feito:**
  - Novo gráfico de assinaturas canceladas por semana na aba **Análises** do admin (`src/components/admin/UserGrowthChart.tsx`).
  - Exibe quantidade de assinaturas canceladas por período (semana ou dia, conforme o filtro).
  - Mesmos filtros do gráfico de crescimento: 7, 15, 30, 60 e 90 dias.
  - API `user-growth` já retornava o campo `cancelled` por período; interface `WeeklyGrowth` atualizada.
- **Benefício:** Visibilidade da taxa de cancelamento para análise de churn e retenção.

---

### 3.4 Sentry (opcional)

- **Status:** Não implementado (opcional no plano).
- **Uso previsto:** Rastreamento de erros em produção (front e back).

---

## Fase 4 – Docker para desenvolvimento

### 4.1 Docker para desenvolvimento local

- **O que foi feito:**
  - `Dockerfile` e `Dockerfile.dev` – build da aplicação Next.js (produção e dev).
  - `docker-compose.yml` (produção) e `docker-compose.dev.yml` (dev) – serviços: **postgres**, **redis**, **app**.
  - `.dockerignore` – reduz contexto de build.
  - Ajuste no `Dockerfile.dev`: cópia da pasta `prisma/` antes de `npm ci` para o `prisma generate` (postinstall) funcionar.
- **Benefício:** Ambiente local alinhado ao de produção (Postgres + Redis + app) sem instalar cada serviço manualmente.

---

## Fase 5 – Segurança (adiada)

- **Status:** Não implementada nesta rodada.
- **Itens do plano:** Validação Zod em todos os endpoints; rate limiting completo.
- **Quando fazer:** Quando priorizar endurecimento de segurança/validação.

---

## Resumo por tipo de melhoria

| Área            | Melhoria                                      | Arquivos / Ação principal                          |
|-----------------|-----------------------------------------------|----------------------------------------------------|
| **Banco**       | Prisma Data Proxy + directUrl                | `prisma/schema.prisma`, docs de proxy              |
| **Banco**       | Backup semanal                               | `scripts/backup-database-weekly.ts`, workflow      |
| **Banco**       | Índices de performance                       | Migration `add_performance_indexes`                |
| **Redis**       | Pool/serverless e filas                     | `src/lib/redis.ts`, queues, workers               |
| **Lembretes**   | Fila + worker (prontos; cron ainda inline)   | `reminders-queue.ts`, `reminder-worker.ts`         |
| **Cache**       | Cache em queries pesadas                     | `src/lib/cache.ts`, symptoms popular, dashboard   |
| **Resiliência** | Retry em APIs externas                       | `src/lib/retry.ts`, `api/openai/route.ts`          |
| **Monitoramento** | Health check + métricas admin              | `/api/health`, `/admin/metrics`                     |
| **Admin**        | Gráfico de assinaturas canceladas          | `UserGrowthChart.tsx`, aba Análises                 |
| **Dev**         | Docker (Postgres + Redis + app)              | Dockerfile(s), docker-compose, Dockerfile.dev fix |

---

## Lembretes (cron e fila) – detalhe

- **Cron (Vercel):** Continua chamando `/api/push/check-reminders` a cada minuto (`vercel.json`). O endpoint processa todos os lembretes do horário **na mesma requisição** (até 10 min de `maxDuration`), em batches para lembretes globais. Nada mudou no comportamento do cron.
- **Fila e worker:** A fila BullMQ e o worker existem e estão prontos para processar jobs de lembrete. Hoje não são usados pelo endpoint; o endpoint não enfileira jobs. Para usar a fila no futuro, seria preciso: (1) o endpoint apenas enfileirar jobs em vez de enviar push direto; (2) algum processo rodando o worker (fora da Vercel, ex.: servidor ou worker dedicado), já que a Vercel não mantém workers long-lived.

---

---

**Última atualização:** 29/01/2026  
*Documento gerado com base no plano de escalabilidade e no estado atual do repositório meDIZ.*

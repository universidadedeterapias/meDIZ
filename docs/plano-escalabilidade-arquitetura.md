# 🚀 Plano de Escalabilidade e Melhorias de Arquitetura - meDIZ

**Objetivo:** Escalar para 4.000 usuários (300 ativos, 1.000 premium) mantendo performance e confiabilidade  
**Prazo Estimado:** 4-6 semanas  
**Prioridade:** Performance > Confiabilidade > Escalabilidade

---

## 📋 FASE 1: CORREÇÕES CRÍTICAS (Semana 1-2)

### 1.1 Connection Pooling do Prisma ⚠️ CRÍTICO
**Problema:** Prisma sem connection pooling adequado para serverless  
**Solução:** Configurar Prisma Data Proxy ou PgBouncer

**Implementação:**
1. **Opção A - Prisma Data Proxy (Recomendado para Vercel)**
   - Criar projeto no Prisma Data Platform
   - Configurar `DATABASE_URL` com proxy
   - Atualizar `prisma/schema.prisma` para usar proxy
   - Benefício: Gerenciamento automático de conexões

2. **Opção B - PgBouncer (Alternativa)**
   - Configurar PgBouncer como intermediário
   - Atualizar `DATABASE_URL` para apontar para PgBouncer
   - Configurar pool size adequado

**Arquivos a Modificar:**
- `src/lib/prisma.ts` - Adicionar configuração de pool
- `.env.local` / Vercel - Atualizar `DATABASE_URL`
- `prisma/schema.prisma` - Configurar datasource

**Estimativa:** 4-6 horas

---

### 1.2 Backup Automatizado do Banco ⚠️ CRÍTICO
**Problema:** Sem backup automatizado  
**Solução:** Configurar backup diário

**Implementação:**
1. **Se usando Vercel Postgres:**
   - Ativar backups automáticos no dashboard
   - Configurar retenção (7-30 dias)
   - Testar restauração

2. **Se usando PostgreSQL externo:**
   - Configurar `pg_dump` diário via cron
   - Armazenar em S3/Cloud Storage
   - Script de restauração

**Arquivos a Criar:**
- `scripts/backup-database.ts` - Script de backup
- `scripts/restore-database.ts` - Script de restauração
- `.github/workflows/backup-daily.yml` - GitHub Actions (se usar)

**Estimativa:** 2-4 horas

---

### 1.3 Filas para Processamento Assíncrono ⚠️ CRÍTICO
**Problema:** Lembretes globais podem causar timeout  
**Solução:** Implementar Bull/BullMQ com Redis

**Implementação:**
1. **Instalar dependências:**
   ```bash
   npm install bullmq ioredis
   ```

2. **Criar estrutura de filas:**
   - `src/lib/queues/reminders-queue.ts` - Fila de lembretes
   - `src/lib/workers/reminder-worker.ts` - Worker para processar
   - `src/app/api/push/check-reminders/route.ts` - Modificar para enfileirar

3. **Configurar worker separado:**
   - Worker processa lembretes de forma assíncrona
   - Retry automático para falhas
   - Monitoramento de jobs

**Arquivos a Criar/Modificar:**
- `src/lib/queues/reminders-queue.ts` (novo)
- `src/lib/workers/reminder-worker.ts` (novo)
- `src/app/api/push/check-reminders/route.ts` (modificar)
- `src/app/api/admin/queues/route.ts` (novo - monitoramento)

**Estimativa:** 8-12 horas

---

### 1.4 Redis Connection Pooling ⚠️ ALTO
**Problema:** Singleton não funciona bem em serverless  
**Solução:** Configurar Redis com connection pooling

**Implementação:**
1. **Atualizar `src/lib/redis.ts`:**
   - Usar connection pool do ioredis
   - Configurar maxRetriesPerRequest
   - Implementar retry logic

2. **Considerar Upstash Redis:**
   - Serverless-native
   - Melhor para Vercel
   - Connection pooling automático

**Arquivos a Modificar:**
- `src/lib/redis.ts`

**Estimativa:** 2-3 horas

---

## 📊 FASE 2: PERFORMANCE E OTIMIZAÇÕES (Semana 2-3)

### 2.1 Cache em Queries Pesadas
**Problema:** Queries pesadas executam toda vez  
**Solução:** Implementar cache Redis

**Implementação:**
1. **Criar utilitário de cache:**
   - `src/lib/cache.ts` - Funções de cache
   - TTL configurável
   - Invalidação automática

2. **Aplicar cache em:**
   - Sintomas populares (já existe parcialmente)
   - Dashboard admin (métricas)
   - Queries de usuários frequentes

**Arquivos a Criar/Modificar:**
- `src/lib/cache.ts` (novo)
- `src/app/api/symptoms/popular/route.ts` (melhorar)
- `src/app/api/admin/dashboard-stats/route.ts` (adicionar cache)

**Estimativa:** 6-8 horas

---

### 2.2 Retry Logic em APIs Externas
**Problema:** Falhas em webhooks n8n não têm retry  
**Solução:** Implementar retry com exponential backoff

**Implementação:**
1. **Criar utilitário de retry:**
   - `src/lib/retry.ts` - Função genérica de retry
   - Exponential backoff
   - Circuit breaker

2. **Aplicar em:**
   - `src/app/api/openai/route.ts` - Webhook n8n
   - Outras chamadas externas críticas

**Arquivos a Criar/Modificar:**
- `src/lib/retry.ts` (novo)
- `src/app/api/openai/route.ts` (modificar)

**Estimativa:** 4-6 horas

---

### 2.3 Otimização de Índices
**Problema:** Algumas queries podem não usar índices  
**Solução:** Analisar e adicionar índices necessários

**Implementação:**
1. **Analisar queries lentas:**
   - Usar `EXPLAIN ANALYZE` no PostgreSQL
   - Identificar queries sem índices

2. **Adicionar índices:**
   - Índices compostos onde necessário
   - Índices parciais para queries específicas

**Arquivos a Modificar:**
- `prisma/schema.prisma` - Adicionar índices
- Criar migration

**Estimativa:** 4-6 horas

---

## 🎨 FASE 3: MONITORAMENTO E OBSERVABILIDADE (Semana 3-4)

### 3.1 Painel de Métricas no Admin
**Problema:** Você quer painel de métricas no admin  
**Solução:** Criar dashboard de métricas em tempo real

**Implementação:**
1. **Criar API de métricas:**
   - `src/app/api/admin/metrics/route.ts` - Endpoint de métricas
   - Métricas: requests/min, latência, erros, etc.

2. **Criar componente de dashboard:**
   - `src/app/admin/metrics/page.tsx` - Página de métricas
   - Gráficos com Recharts
   - Atualização em tempo real

3. **Armazenar métricas:**
   - Redis para métricas em tempo real
   - Banco para histórico (opcional)

**Arquivos a Criar:**
- `src/app/api/admin/metrics/route.ts` (novo)
- `src/app/admin/metrics/page.tsx` (novo)
- `src/components/admin/metrics-dashboard.tsx` (novo)

**Estimativa:** 8-12 horas

---

### 3.2 Health Checks
**Problema:** Sem endpoint de health check  
**Solução:** Criar endpoint `/api/health`

**Implementação:**
1. **Criar endpoint:**
   - Verificar conexão com DB
   - Verificar conexão com Redis
   - Retornar status detalhado

**Arquivos a Criar:**
- `src/app/api/health/route.ts` (novo)

**Estimativa:** 2-3 horas

---

### 3.3 Integração com Sentry (Opcional)
**Problema:** Erros não são rastreados automaticamente  
**Solução:** Integrar Sentry para error tracking

**Implementação:**
1. **Instalar Sentry:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configurar:**
   - `sentry.client.config.ts`
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`

**Arquivos a Criar:**
- `sentry.client.config.ts` (novo)
- `sentry.server.config.ts` (novo)
- `sentry.edge.config.ts` (novo)
- `next.config.mjs` (modificar)

**Estimativa:** 4-6 horas

---

## 🐳 FASE 4: DOCKER E DESENVOLVIMENTO (Semana 4-5)

### 4.1 Docker para Desenvolvimento Local
**Problema:** Você pediu Docker para desenvolvimento  
**Solução:** Criar Dockerfile e docker-compose.yml

**Implementação:**
1. **Criar Dockerfile:**
   - Multi-stage build
   - Otimizado para Next.js

2. **Criar docker-compose.yml:**
   - Serviço da aplicação
   - PostgreSQL
   - Redis
   - Volumes para persistência

3. **Documentação:**
   - README com instruções
   - Scripts de inicialização

**Arquivos a Criar:**
- `Dockerfile` (novo)
- `docker-compose.yml` (novo)
- `.dockerignore` (novo)
- `docs/docker-setup.md` (novo)

**Estimativa:** 6-8 horas

---

### 4.2 Kubernetes (Opcional - Futuro)
**Problema:** Você mencionou Kubernetes  
**Solução:** Preparar para Kubernetes (não urgente)

**Nota:** Kubernetes não é necessário agora se continuar na Vercel.  
Pode ser útil se migrar para infraestrutura própria no futuro.

**Estimativa:** 12-16 horas (quando necessário)

---

## 🔒 FASE 5: SEGURANÇA E VALIDAÇÃO (Semana 5-6)

### 5.1 Validação de Input Completa
**Problema:** Alguns endpoints não validam input  
**Solução:** Adicionar validação Zod em todos os endpoints

**Implementação:**
1. **Criar schemas Zod:**
   - Para cada endpoint que recebe input
   - Validação de tipos e formatos

2. **Aplicar validação:**
   - Middleware de validação
   - Mensagens de erro claras

**Arquivos a Modificar:**
- Todos os endpoints de API que recebem input

**Estimativa:** 8-10 horas

---

### 5.2 Rate Limiting Completo
**Problema:** Rate limiting apenas em login  
**Solução:** Adicionar rate limiting em endpoints críticos

**Implementação:**
1. **Criar middleware de rate limiting:**
   - `src/lib/rateLimiter.ts` (já existe, melhorar)
   - Aplicar em endpoints críticos

2. **Endpoints a proteger:**
   - `/api/openai` - Chat
   - `/api/push/subscribe` - Notificações
   - `/api/admin/*` - Admin endpoints

**Arquivos a Modificar:**
- `src/lib/rateLimiter.ts` (melhorar)
- Endpoints críticos (adicionar rate limiting)

**Estimativa:** 4-6 horas

---

## 📈 CRONOGRAMA RESUMIDO

| Semana | Fase | Tarefas | Horas Estimadas |
|--------|------|---------|-----------------|
| 1-2 | Fase 1 | Correções Críticas | 16-25h |
| 2-3 | Fase 2 | Performance | 14-20h |
| 3-4 | Fase 3 | Monitoramento | 14-21h |
| 4-5 | Fase 4 | Docker | 6-8h |
| 5-6 | Fase 5 | Segurança | 12-16h |
| **TOTAL** | | | **62-90 horas** |

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### ✅ FAZER AGORA (Antes de Escalar)
1. Connection pooling do Prisma
2. Backup automatizado
3. Filas para lembretes
4. Cache em queries pesadas

### ✅ FAZER EM BREVE (Próximas 2-4 semanas)
5. Painel de métricas no admin
6. Retry logic em APIs externas
7. Docker para desenvolvimento
8. Health checks

### ✅ MELHORIAS CONTÍNUAS
9. Validação de input completa
10. Rate limiting completo
11. Integração Sentry (opcional)
12. Kubernetes (futuro)

---

## 💰 CUSTOS ESTIMADOS (Mensal)

### Serviços Necessários:
- **Prisma Data Proxy:** ~$20-50/mês (depende do uso)
- **Upstash Redis:** Gratuito até 10K comandos/dia, depois ~$10-30/mês
- **Sentry (Opcional):** Gratuito até 5K eventos/mês, depois ~$26/mês
- **Backup Storage:** ~$5-10/mês (depende do tamanho)

**Total Estimado:** $35-115/mês adicional

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1 - Crítico
- [ ] Configurar Prisma Data Proxy ou PgBouncer
- [ ] Configurar backup automatizado do banco
- [ ] Implementar filas (Bull/BullMQ) para lembretes
- [ ] Melhorar Redis connection pooling

### Fase 2 - Performance
- [ ] Implementar cache Redis em queries pesadas
- [ ] Adicionar retry logic em APIs externas
- [ ] Otimizar índices do banco

### Fase 3 - Monitoramento
- [ ] Criar painel de métricas no admin
- [ ] Implementar health checks
- [ ] (Opcional) Integrar Sentry

### Fase 4 - Docker
- [ ] Criar Dockerfile
- [ ] Criar docker-compose.yml
- [ ] Documentar setup

### Fase 5 - Segurança
- [ ] Adicionar validação Zod em todos os endpoints
- [ ] Implementar rate limiting completo

---

## 🚀 PRÓXIMOS PASSOS

1. **Revisar este plano** e aprovar prioridades
2. **Começar pela Fase 1** (correções críticas)
3. **Testar cada implementação** antes de seguir
4. **Monitorar métricas** após cada fase

**Posso começar a implementar assim que você aprovar!** 🎯

# 📊 Análise de Índices do Banco de Dados

**Data:** Outubro 2025  
**Objetivo:** Otimizar queries através de índices adequados

---

## ✅ Índices Existentes (Bem Implementados)

### User
- ✅ `email` (unique) - Busca por email (login, autenticação)
- ✅ `stripeCustomerId` (unique) - Busca por customer ID do Stripe
- ✅ `mensagem_enviada` - Filtros por status de mensagem
- ✅ `status_verificacao` - Filtros por status de verificação
- ✅ `mensagem_grupo_essencia` - Filtros por grupo
- ✅ `preferredLanguage` - Filtros por idioma preferido
- ✅ `createdAt` - Ordenação e filtros por data de criação

### ChatMessage
- ✅ `[chatSessionId, createdAt]` (composto) - Busca de mensagens por sessão ordenadas por data

### ChatSession
- ✅ `threadId` (unique) - Busca por thread ID do OpenAI

### Subscription
- ✅ `stripeSubscriptionId` (unique) - Busca por subscription ID do Stripe

### LogExecucao
- ✅ `data_execucao` - Filtros por data de execução

### AuditLog
- ✅ `adminId` - Busca por admin
- ✅ `timestamp` - Ordenação por data
- ✅ `action` - Filtros por ação
- ✅ `resource` - Filtros por recurso

### AdminRequest
- ✅ `status` - Filtros por status (PENDING, APPROVED, REJECTED)
- ✅ `requestedAt` - Ordenação por data de solicitação
- ✅ `userEmail` - Busca por email do usuário

### SymptomFolder
- ✅ `userId` - Busca de pastas por usuário
- ✅ `createdAt` - Ordenação por data

### SavedSymptom
- ✅ `folderId` - Busca de sintomas por pasta
- ✅ `createdAt` - Ordenação por data

### PushSubscription
- ✅ `userId` - Busca de subscriptions por usuário
- ✅ `endpoint` (unique) - Busca por endpoint

### Reminder
- ✅ `userId` - Busca de lembretes por usuário
- ✅ `active` - Filtros por status ativo
- ✅ `time` - Busca por horário (HH:mm)

---

## 🔍 Índices Recomendados (A Adicionar)

### 1. Subscription - Índices Compostos para Queries Frequentes

**Problema:** Queries para buscar assinaturas ativas são frequentes no dashboard.

**Solução:**
```prisma
model Subscription {
  // ... campos existentes ...
  
  // Índice composto para buscar assinaturas ativas
  @@index([status, currentPeriodEnd])
  
  // Índice composto para buscar por usuário e status
  @@index([userId, status])
}
```

**Benefício:** Acelera queries como:
- `SELECT * FROM Subscription WHERE status = 'active' AND currentPeriodEnd >= NOW()`
- `SELECT * FROM Subscription WHERE userId = ? AND status = 'active'`

---

### 2. ChatSession - Índices para Queries de Usuário

**Problema:** Buscar sessões de chat por usuário ordenadas por data.

**Solução:**
```prisma
model ChatSession {
  // ... campos existentes ...
  
  // Índice composto para buscar sessões por usuário ordenadas por data
  @@index([userId, startedAt])
  
  // Índice para buscar sessões favoritas
  @@index([userId, isFavorite])
}
```

**Benefício:** Acelera queries como:
- `SELECT * FROM ChatSession WHERE userId = ? ORDER BY startedAt DESC`
- `SELECT * FROM ChatSession WHERE userId = ? AND isFavorite = true`

---

### 3. User - Índice Composto para Busca de Admin

**Problema:** Verificação de admin é feita por email, mas pode ser otimizada.

**Solução:**
```prisma
model User {
  // ... campos existentes ...
  
  // Índice parcial para emails de admin (se necessário)
  // Nota: Verificação de admin é feita por LIKE '%@mediz.com', 
  // então índice não ajuda muito, mas manter como está é OK
}
```

**Nota:** A verificação de admin atual (`email.includes('@mediz.com')`) não se beneficia de índice, mas é uma query rara e simples.

---

### 4. Reminder - Índice Composto para Busca de Lembretes Ativos

**Problema:** Query de lembretes ativos por horário é executada a cada minuto.

**Solução:**
```prisma
model Reminder {
  // ... campos existentes ...
  
  // Índice composto para buscar lembretes ativos por horário
  @@index([active, time])
  
  // Índice composto para lembretes globais (userId IS NULL)
  // Nota: PostgreSQL não suporta índices parciais diretamente no Prisma,
  // mas o índice [active, time] já ajuda
}
```

**Benefício:** Acelera a query crítica:
- `SELECT * FROM Reminder WHERE active = true AND time = ? AND (userId = ? OR userId IS NULL)`

---

### 5. ChatAnswerCache - Índice para Expiração

**Problema:** Limpeza de cache expirado pode ser lenta.

**Solução:**
```prisma
model ChatAnswerCache {
  // ... campos existentes ...
  
  // Índice para buscar cache expirado
  @@index([expiresAt])
}
```

**Benefício:** Acelera limpeza de cache:
- `DELETE FROM ChatAnswerCache WHERE expiresAt < NOW()`

---

## 📝 Migração Recomendada

### Passo 1: Adicionar Índices ao Schema

```prisma
model Subscription {
  // ... campos existentes ...
  
  @@index([status, currentPeriodEnd])
  @@index([userId, status])
}

model ChatSession {
  // ... campos existentes ...
  
  @@index([userId, startedAt])
  @@index([userId, isFavorite])
}

model Reminder {
  // ... campos existentes ...
  
  @@index([active, time])
}

model ChatAnswerCache {
  // ... campos existentes ...
  
  @@index([expiresAt])
}
```

### Passo 2: Criar Migration

```bash
npx prisma migrate dev --name add_performance_indexes
```

### Passo 3: Verificar Impacto

Após criar os índices, monitorar:
- Tempo de queries no dashboard admin
- Tempo de busca de sessões de chat
- Tempo de processamento de lembretes

---

## ⚠️ Considerações Importantes

### 1. Trade-off: Espaço vs Performance
- Índices ocupam espaço no banco
- Aumentam tempo de INSERT/UPDATE
- Beneficiam SELECT queries

### 2. Índices Compostos
- Ordem dos campos importa
- Primeiro campo deve ser o mais seletivo
- Exemplo: `[userId, status]` é melhor que `[status, userId]` se userId é mais seletivo

### 3. Índices Parciais (PostgreSQL)
- Não suportados diretamente no Prisma
- Podem ser criados manualmente via SQL raw
- Úteis para queries com WHERE específico

---

## 🎯 Priorização

### Alta Prioridade (Implementar Agora)
1. ✅ `Subscription[status, currentPeriodEnd]` - Dashboard admin
2. ✅ `ChatSession[userId, startedAt]` - Listagem de sessões
3. ✅ `Reminder[active, time]` - Processamento de lembretes

### Média Prioridade (Implementar em Breve)
4. ✅ `Subscription[userId, status]` - Busca de assinatura por usuário
5. ✅ `ChatAnswerCache[expiresAt]` - Limpeza de cache

### Baixa Prioridade (Opcional)
6. `ChatSession[userId, isFavorite]` - Se busca de favoritos for frequente

---

## 📊 Métricas de Sucesso

Após implementação, monitorar:
- **Tempo de query do dashboard:** < 500ms (atualmente pode estar > 1s)
- **Tempo de busca de sessões:** < 200ms
- **Tempo de processamento de lembretes:** < 100ms por minuto

---

## 🔄 Próximos Passos

1. ✅ Adicionar índices ao schema
2. ✅ Criar migration
3. ✅ Testar em desenvolvimento
4. ✅ Aplicar em produção
5. ✅ Monitorar performance

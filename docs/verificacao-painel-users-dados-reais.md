# Verificação do Painel de Usuários - Dados Reais do Banco

**Data:** 10/10/2025  
**Status:** ✅ Verificado e Documentado

---

## 🔍 Objetivo da Verificação

Verificar se o painel de usuários (`/admin/users`) está buscando dados reais do banco de dados, especialmente:
1. Se os usuários premium estão sendo buscados da tabela `Subscription`
2. Se os usuários ativos nos últimos 7 dias estão sendo calculados corretamente
3. Se há inconsistências nos dados

---

## 📊 Resultados da Auditoria

### Dados Gerais
- **Total de usuários:** 422
- **Usuários premium:** 44 (com subscription ativa)
- **Usuários gratuitos:** 378
- **Usuários órfãos:** 178 (sem Account, Session ou Subscription)
- **Usuários admin:** Calculado dinamicamente (email @exemplo.com)

### Distribuição de Usuários Gratuitos por Período
- **1-7 dias:** 24 usuários
- **8-30 dias:** 69 usuários
- **31+ dias:** 285 usuários

---

## ✅ Verificações Realizadas

### 1. Usuários Premium - Fonte de Verdade ✅

**Implementação Atual:**
```typescript
// src/lib/premiumUtils.ts
export async function countPremiumUsers(): Promise<number> {
  const count = await prisma.user.count({
    where: {
      subscriptions: {
        some: {
          status: {
            in: ['active', 'ACTIVE', 'cancel_at_period_end']
          },
          currentPeriodEnd: {
            gte: new Date()
          }
        }
      }
    }
  })
  return count
}
```

**Status:** ✅ **FUNCIONANDO CORRETAMENTE**
- Busca diretamente da tabela `Subscription`
- Verifica status ativo (`active`, `ACTIVE`, `cancel_at_period_end`)
- Valida se `currentPeriodEnd >= NOW()`
- Retorna 44 usuários premium (conforme auditoria)

---

### 2. Usuários Ativos (Últimos 7 Dias) ⚠️ PROBLEMA IDENTIFICADO

**Implementação Atual:**
```typescript
// src/app/api/admin/users/route.ts (linhas 158-160)
activeUsers: processedUsers.filter(u => 
  u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
).length
```

**Problema Identificado:**
- `lastLogin` é baseado em `user.sessions[0]?.expires` (linha 114)
- O campo `expires` da sessão indica quando a sessão **expira**, não quando o usuário fez login
- Isso pode causar contagem incorreta de usuários ativos

**Solução Proposta:**
Usar a tabela `ChatSession` para determinar usuários ativos (usuários que fizeram pesquisas nos últimos 7 dias):

```typescript
// Buscar usuários com atividade real nos últimos 7 dias
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

const activeUsersCount = await prisma.user.count({
  where: {
    chatSessions: {
      some: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    }
  }
})
```

---

### 3. Inconsistências Encontradas ⚠️

#### A) Subscription Expirada mas Ativa
- **Usuário:** neto.edgarsa@gmail.com
- **Plano:** Plano Básico
- **Status:** `active`
- **Expirou em:** 13/08/2025
- **Problema:** Status deveria ser `canceled` ou `expired`

#### B) Usuários Órfãos (178)
- **Definição:** Usuários sem Account, Session ou Subscription
- **Exemplos:**
  - terapeutaericasuzart@gmail.com
  - teste@teste.com.br
  - paulo@teste.com
  - teste13@gmail.com
  - matusalemsam@gmail.com
  - danieleenglishteacher2@gmail.com
  - superasarandi@gmail.com
  - katiacarelli94@gmail.com
  - iracemaamaliamm@gmail.com
  - margareteb.lins@hotmail.com
  - ... e mais 168

**Impacto:** Esses usuários aparecem na contagem total mas nunca fizeram login

#### C) Usuários com Múltiplas Subscriptions (3)
1. **marilin_mb@yahoo.com.br:** 3 subscriptions ativas
   - ExemploApp Assin Anual 30D - Free (até 22/07/2026)
   - Assin Mensal 30D|free (até 22/10/2025)
   - Assin Mensal 30D|free (até 22/10/2025)

2. **paulobarbosashows@gmail.com:** 3 subscriptions canceladas
   - Plano Básico (até 06/10/2025)
   - Assin Mensal 30D|free (até 06/10/2025)
   - Assin Mensal 30D|free (até 06/10/2025)

3. **martalevita1976@gmail.com:** 2 subscriptions ativas
   - Assin Mensal 30D|free (até 03/11/2025)
   - Assinatura Mensal PlataformaPagamento (até 02/11/2025)

---

## 🔧 Correções Necessárias

### 1. Corrigir Cálculo de Usuários Ativos (PRIORIDADE ALTA)

**Arquivo:** `src/app/api/admin/users/route.ts`

**Mudança:**
```typescript
// ANTES (linha 158-160)
activeUsers: processedUsers.filter(u => 
  u.lastLogin && new Date(u.lastLogin) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
).length

// DEPOIS
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
const activeUsersCount = await prisma.user.count({
  where: {
    chatSessions: {
      some: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    }
  }
})

// Nas stats
activeUsers: activeUsersCount
```

---

### 2. Criar Script para Limpar Subscription Expirada (PRIORIDADE MÉDIA)

**Arquivo:** `src/scripts/fix-expired-subscriptions.ts`

```typescript
import { prisma } from '@/lib/prisma'

async function fixExpiredSubscriptions() {
  const expiredButActive = await prisma.subscription.updateMany({
    where: {
      status: {
        in: ['active', 'ACTIVE']
      },
      currentPeriodEnd: {
        lt: new Date()
      }
    },
    data: {
      status: 'expired'
    }
  })

  console.log(`✅ ${expiredButActive.count} subscriptions expiradas foram atualizadas`)
}

fixExpiredSubscriptions()
```

---

### 3. Adicionar Filtro para Excluir Usuários Órfãos (PRIORIDADE BAIXA)

**Opcional:** Adicionar toggle no painel para mostrar/ocultar usuários órfãos

```typescript
// Adicionar parâmetro
const hideOrphans = searchParams.get('hideOrphans') === 'true'

if (hideOrphans) {
  whereClause.OR = [
    { accounts: { some: {} } },
    { sessions: { some: {} } },
    { subscriptions: { some: {} } }
  ]
}
```

---

## 📋 Queries de Validação SQL

### Total de Usuários
```sql
SELECT COUNT(*) FROM "User";
-- Resultado esperado: 422
```

### Usuários Premium (Fonte de Verdade)
```sql
SELECT COUNT(DISTINCT u.id) FROM "User" u
JOIN "Subscription" s ON u.id = s."userId"
WHERE s.status IN ('active', 'ACTIVE', 'cancel_at_period_end')
AND s."currentPeriodEnd" >= NOW();
-- Resultado esperado: 44
```

### Usuários Ativos (Últimos 7 Dias) - CORRIGIDO
```sql
SELECT COUNT(DISTINCT u.id) FROM "User" u
JOIN "ChatSession" cs ON u.id = cs."userId"
WHERE cs."createdAt" >= NOW() - INTERVAL '7 days';
-- Resultado: A ser verificado após correção
```

### Subscriptions Expiradas mas Ativas
```sql
SELECT u.email, s.status, s."currentPeriodEnd"
FROM "User" u
JOIN "Subscription" s ON u.id = s."userId"
WHERE s.status IN ('active', 'ACTIVE')
AND s."currentPeriodEnd" < NOW();
-- Resultado esperado: 1 (neto.edgarsa@gmail.com)
```

### Usuários Órfãos
```sql
SELECT COUNT(*) FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "Account" a WHERE a."userId" = u.id)
AND NOT EXISTS (SELECT 1 FROM "Session" s WHERE s."userId" = u.id)
AND NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s."userId" = u.id);
-- Resultado esperado: 178
```

---

## ✅ Conclusões

### O que está funcionando:
1. ✅ **Usuários premium** são buscados corretamente da tabela `Subscription`
2. ✅ **Fonte de verdade** implementada corretamente (`premiumUtils.ts`)
3. ✅ **Paginação** e filtros funcionando
4. ✅ **Estatísticas gerais** precisas

### O que precisa ser corrigido:
1. ⚠️ **Usuários ativos** - Cálculo incorreto (usa `expires` ao invés de atividade real)
2. ⚠️ **Subscription expirada** - 1 registro com status inconsistente
3. ℹ️ **Usuários órfãos** - 178 usuários sem vínculos (não é erro, mas pode poluir dados)

---

## 🚀 Próximos Passos

1. **Implementar correção de usuários ativos** (usar `ChatSession.createdAt`)
2. **Executar script de limpeza** de subscriptions expiradas
3. **Adicionar monitoramento** para detectar inconsistências automaticamente
4. **Considerar** adicionar filtro para ocultar usuários órfãos

---

## 📝 Comandos Úteis

```bash
# Executar auditoria
npm run audit-users

# Verificar subscriptions
npm run check-subscriptions

# Testar após correções
npm run test-users-api
```

---

**Verificado por:** Sistema de Auditoria  
**Próxima revisão:** Após implementação das correções


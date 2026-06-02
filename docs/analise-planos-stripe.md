# Análise dos Planos do Stripe no Banco de Dados

## Resumo Executivo

**Data da Análise:** $(date)
**Total de Planos no Banco:** 14
**Planos com stripePriceId do Stripe (começam com `price_`):** 7
**Planos Ativos do Stripe:** 0 (todos estão inativos)

## Planos do Stripe Cadastrados no Banco

### Planos Válidos do Stripe (formato `price_xxxxx`)

| # | Nome | stripePriceId | Status | Intervalo | Valor | Observações |
|---|------|---------------|--------|-----------|-------|-------------|
| 1 | Plano Básico | `price_1AbCdEfG2HIjkL3MnOpQ` | ❌ Inativo | NULL | NULL | Plano antigo, sem intervalo definido |
| 2 | meDIZ Assin Anual 30D - Free | `price_1Rd9stAOr2PaJWfnDuUjFjgX` | ❌ Inativo | YEAR | R$ 358.80 | Plano anual completo |
| 3 | Assin Mensal 30D\|free | `price_1RcsjzAOr2PaJWfnibYgKomW` | ❌ Inativo | MONTH | R$ 39.90 | Plano mensal completo |
| 4 | Assinatura Mensal | `price_1RbyGdAOr2PaJWfnbQPzchwe` | ❌ Inativo | MONTH | R$ 39.90 | Plano mensal |
| 5 | Assinatura Anual | `price_1RbyGdAOr2PaJWfnpNfuAGBY` | ❌ Inativo | YEAR | R$ 358.80 | Plano anual |
| 6 | Assin Mensal 30D\|free | `price_1RcsjzA` | ❌ Inativo | MONTH | NULL | **⚠️ PROBLEMA: stripePriceId truncado** |
| 7 | meDIZ Assin Anual 30D - Free | `price_1Rd9st` | ❌ Inativo | YEAR | NULL | **⚠️ PROBLEMA: stripePriceId truncado** |

### Planos que NÃO são do Stripe (Hotmart)

| # | Nome | stripePriceId | Status | Intervalo | Valor |
|---|------|---------------|--------|-----------|-------|
| 8 | Plano Profissional \| Mensal | `9dv1fqir` | ✅ Ativo | MONTH | R$ 39.90 |
| 9 | PLANO PROFISSIONAL - ANUAL | `jcuheq2m` | ✅ Ativo | YEAR | R$ 358.80 |
| 10 | PLANO PROFISSIONAL - MENSAL c/ 30D Experiência | `5zwrxs0n` | ✅ Ativo | MONTH | R$ 39.90 |
| 11 | Plano 1 Real | `b24v0i4q` | ✅ Ativo | MONTH | R$ 39.90 |
| 12 | PLANO PROFISSIONAL \| ANUAL \| C/ 30D GRATUITOS | `2icona9m` | ✅ Ativo | YEAR | R$ 358.80 |
| 13 | Plano Mensal - Dólar | `qhs594oc` | ✅ Ativo | MONTH | USD $9.90 |
| 14 | Plano Anual - Dólar | `i7m8kqyw` | ✅ Ativo | YEAR | USD $97.00 |

## Problemas Identificados

### 1. ⚠️ Planos do Stripe Todos Inativos
- **Problema:** Todos os 7 planos com `stripePriceId` do Stripe estão marcados como `active: false`
- **Impacto:** Esses planos não aparecerão nas listagens públicas, mas ainda podem ser usados se alguém tiver o `stripePriceId`
- **Recomendação:** Verificar se esses planos ainda devem estar ativos ou se foram substituídos pelos planos Hotmart

### 2. ⚠️ stripePriceId Truncados
- **Problema:** 2 planos têm `stripePriceId` truncados:
  - `price_1RcsjzA` (deveria ser `price_1RcsjzAOr2PaJWfnibYgKomW`)
  - `price_1Rd9st` (deveria ser `price_1Rd9stAOr2PaJWfnDuUjFjgX`)
- **Impacto:** O webhook do Stripe **NÃO conseguirá encontrar esses planos** quando receber eventos, pois o ID está incompleto
- **Recomendação:** Corrigir os `stripePriceId` truncados ou remover esses planos duplicados

### 3. ⚠️ Planos Duplicados
- **Problema:** Existem planos duplicados com nomes similares:
  - "Assin Mensal 30D\|free" aparece 2 vezes (IDs diferentes)
  - "meDIZ Assin Anual 30D - Free" aparece 2 vezes (IDs diferentes)
- **Impacto:** Pode causar confusão e inconsistências
- **Recomendação:** Consolidar ou remover duplicatas

### 4. ⚠️ Planos Hotmart Usando Campo stripePriceId
- **Problema:** Os planos da Hotmart estão usando o campo `stripePriceId` com valores que não são do Stripe (ex: `9dv1fqir`)
- **Impacto:** O webhook do Stripe **NÃO reconhecerá esses planos**, pois eles não têm um `stripePriceId` válido do Stripe
- **Observação:** Isso é esperado, pois esses planos vêm da Hotmart, não do Stripe. O webhook do Stripe não deve processá-los.

## Como o Webhook do Stripe Funciona

### Fluxo de Reconhecimento

1. **Stripe envia webhook** com `price.id` (ex: `price_1RcsjzAOr2PaJWfnibYgKomW`)
2. **Código busca no banco:**
   ```typescript
   const plan = await prisma.plan.findUnique({
     where: { stripePriceId: priceId }
   })
   ```
3. **Se encontrar:** Processa a assinatura
4. **Se NÃO encontrar:** Loga aviso e interrompe processamento

### Planos que o Webhook Reconhecerá

✅ **Reconhecerá:**
- `price_1AbCdEfG2HIjkL3MnOpQ` (se ativo)
- `price_1Rd9stAOr2PaJWfnDuUjFjgX` (se ativo)
- `price_1RcsjzAOr2PaJWfnibYgKomW` (se ativo)
- `price_1RbyGdAOr2PaJWfnbQPzchwe` (se ativo)
- `price_1RbyGdAOr2PaJWfnpNfuAGBY` (se ativo)

❌ **NÃO Reconhecerá:**
- `price_1RcsjzA` (truncado - incompleto)
- `price_1Rd9st` (truncado - incompleto)
- `9dv1fqir`, `jcuheq2m`, etc. (são da Hotmart, não do Stripe)

## Recomendações

### Ações Imediatas

1. **Corrigir stripePriceId truncados:**
   - Atualizar `price_1RcsjzA` → `price_1RcsjzAOr2PaJWfnibYgKomW`
   - Atualizar `price_1Rd9st` → `price_1Rd9stAOr2PaJWfnDuUjFjgX`

2. **Remover duplicatas:**
   - Decidir qual versão manter de cada plano duplicado
   - Remover ou consolidar os duplicados

3. **Ativar planos do Stripe (se necessário):**
   - Se os planos do Stripe ainda devem ser usados, marcar como `active: true`
   - Se foram substituídos pela Hotmart, considerar remover ou arquivar

### Validação no Stripe

Para validar se os `stripePriceId` são válidos no Stripe, execute:

```bash
npx tsx src/scripts/verify-stripe-plans.ts
```

**Nota:** Requer `STRIPE_SECRET_KEY` configurada no `.env`

## Conclusão

- **7 planos do Stripe** estão cadastrados no banco
- **Todos estão inativos** (`active: false`)
- **2 planos têm stripePriceId truncados** e não serão reconhecidos pelo webhook
- **7 planos ativos são da Hotmart**, não do Stripe
- **O webhook do Stripe só processará planos com `stripePriceId` válido e completo**



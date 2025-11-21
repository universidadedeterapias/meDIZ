# Variáveis de Ambiente - Planos Hotmart

## Visão Geral

Este documento lista as variáveis de ambiente relacionadas aos planos Hotmart que devem ser configuradas no Vercel.

## Variáveis Existentes (Manter)

### Autenticação e Configuração Base
- `HOTMART_MEDIZ_PRODUCT_ID` - ID do produto na Hotmart
- `HOTMART_WEBHOOK_SECRET` - Secret para validação de webhooks da Hotmart

### Variáveis Legadas (Opcionais - Para Compatibilidade)
As seguintes variáveis são usadas apenas pelo script legado `seed-hotmart-plans.ts` e **NÃO são mais necessárias** para o funcionamento do webhook principal:

- `HOTMART_MONTHLY_PRICE_CODE` - Código do plano mensal (legado)
  - **Valor atual recomendado:** `price_hotmart_mensal`
  - **Status:** Pode manter se já estiver configurado, mas não é crítico
- `HOTMART_YEARLY_PRICE_CODE` - Código do plano anual (legado)
  - **Valor atual recomendado:** `price_hotmart_anual`
  - **Status:** Pode manter se já estiver configurado, mas não é crítico
- `HOTMART_MONTHLY_PLAN_NAME` - Nome do plano mensal (legado - opcional)
- `HOTMART_YEARLY_PLAN_NAME` - Nome do plano anual (legado - opcional)
- `HOTMART_MONTHLY_AMOUNT` - Valor do plano mensal em centavos (legado - opcional)
- `HOTMART_YEARLY_AMOUNT` - Valor do plano anual em centavos (legado - opcional)

**Importante:** O webhook principal (`/api/hotmart`) **NÃO usa essas variáveis**. Ele busca planos por:
1. `hotmartOfferKey` (sistema novo)
2. Códigos hardcoded `price_hotmart_mensal` e `price_hotmart_anual` (fallback)

## Nova Estrutura

Com a implementação do campo `hotmartOfferKey` no modelo `Plan`, os planos são agora identificados diretamente pelo `offerKey` recebido nos webhooks da Hotmart. Isso elimina a necessidade de variáveis de ambiente para cada plano individual.

## Planos Configurados

Os planos são sincronizados através do script `sync-hotmart-plans.ts` e incluem:

### Planos BRL (Real Brasileiro)
1. **Mensal Base** - `offerKey: 9dv1fqir` - R$ 39,90/mês
2. **Mensal com Trial** - `offerKey: 5zwrxs0n` - R$ 39,90/mês (30 dias trial)
3. **Mensal Campanha** - `offerKey: b24v0i4q` - R$ 39,90/mês (30 dias trial)
4. **Anual Base** - `offerKey: jcuheq2m` - R$ 358,80/ano
5. **Anual com Trial** - `offerKey: 2icona9m` - R$ 358,80/ano (30 dias trial)

### Planos USD (Dólar)
1. **Mensal USD** - `offerKey: qhs594oc` - $ 9,90/mês
2. **Anual USD** - `offerKey: i7m8kqyw` - $ 97,00/ano

## Como Sincronizar Planos

Execute o script de sincronização após deploy ou quando novos planos forem adicionados:

```bash
npm run sync-hotmart-plans
```

Este script:
- Cria novos planos se não existirem
- Atualiza planos existentes com novos dados
- Mantém compatibilidade com planos antigos

## Notas Importantes

1. **Não é necessário** configurar variáveis de ambiente para cada plano individual
2. O webhook da Hotmart identifica automaticamente o plano pelo `offerKey`
3. O script `sync-hotmart-plans.ts` deve ser executado sempre que novos planos forem adicionados na Hotmart
4. Os planos são armazenados no banco de dados, não em variáveis de ambiente
5. **As variáveis `HOTMART_MONTHLY_PRICE_CODE` e `HOTMART_YEARLY_PRICE_CODE` podem ser mantidas** se já estiverem configuradas (para compatibilidade com scripts legados), mas **não são mais críticas** para o funcionamento do sistema

## Troubleshooting

Se um webhook não conseguir identificar o plano:
1. Verifique se o `offerKey` está mapeado no banco de dados
2. Execute `npm run sync-hotmart-plans` para sincronizar
3. Verifique os logs do webhook para ver qual `offerKey` foi recebido


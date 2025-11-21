# Como o Banco de Dados se Conecta à Hotmart

## Visão Geral

O banco de dados **NÃO se conecta diretamente** à Hotmart. A conexão funciona através de **webhooks** (chamadas HTTP que a Hotmart faz para nossa API).

## Fluxo Completo

```
┌─────────────┐
│   Hotmart   │
│  (Servidor) │
└──────┬──────┘
       │
       │ 1. Evento acontece (compra, renovação, cancelamento)
       │
       ▼
┌─────────────────────────────────────────┐
│  Hotmart envia Webhook HTTP POST        │
│  para: https://seudominio.com/api/hotmart│
│                                         │
│  Payload inclui:                       │
│  - offer.code (ex: "9dv1fqir")        │
│  - purchase.status                     │
│  - buyer.email                         │
│  - subscription.plan.name              │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Nossa API: /api/hotmart/route.ts      │
│                                         │
│  1. Recebe o webhook                    │
│  2. Valida o payload                    │
│  3. Extrai o offerCode                  │
│  4. Busca plano no banco por:           │
│     a) hotmartOfferKey = offerCode      │
│     b) stripePriceId (fallback)         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Banco de Dados (PostgreSQL)            │
│                                         │
│  Tabela: Plan                           │
│  - id                                   │
│  - name                                 │
│  - stripePriceId                        │
│  - hotmartOfferKey  ← Busca aqui!      │
│  - amount, currency, interval           │
│  - trialPeriodDays                      │
└──────┬──────────────────────────────────┘
       │
       │ Retorna o plano encontrado
       │
       ▼
┌─────────────────────────────────────────┐
│  Nossa API continua processando:        │
│                                         │
│  1. Busca/cria usuário pelo email       │
│  2. Cria/atualiza Subscription          │
│  3. Salva no banco de dados             │
└─────────────────────────────────────────┘
```

## Passo a Passo Detalhado

### 1. Hotmart Envia Webhook

Quando algo acontece na Hotmart (compra aprovada, renovação, cancelamento), ela faz uma requisição HTTP POST para nossa API:

```http
POST https://seudominio.com/api/hotmart
Content-Type: application/json

{
  "event": "PURCHASE_APPROVED",
  "data": {
    "purchase": {
      "offer": {
        "code": "9dv1fqir"  ← Este é o offerKey!
      },
      "buyer": {
        "email": "usuario@example.com"
      },
      "price": {
        "value": 39.90,
        "currency_value": "BRL"
      }
    },
    "subscription": {
      "plan": {
        "name": "Plano Profissional | Mensal"
      }
    }
  }
}
```

### 2. Nossa API Recebe e Processa

O arquivo `src/app/api/hotmart/route.ts` recebe esse webhook:

```typescript
export async function POST(req: NextRequest) {
  // 1. Lê o body do webhook
  const bodyText = await req.text()
  const parsed = JSON.parse(bodyText)
  
  // 2. Extrai o offerCode
  const offerCode = parsed.data.purchase.offer?.code  // "9dv1fqir"
  
  // 3. Busca o plano no banco pelo hotmartOfferKey
  let plan = await prisma.plan.findUnique({
    where: { hotmartOfferKey: offerCode }
  })
  
  // 4. Se não encontrou, tenta fallback
  if (!plan) {
    plan = await prisma.plan.findUnique({
      where: { stripePriceId: 'price_hotmart_mensal' }
    })
  }
  
  // 5. Cria/atualiza a assinatura no banco
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: syntheticId },
    create: { /* ... */ },
    update: { /* ... */ }
  })
}
```

### 3. Banco de Dados Armazena

O banco de dados armazena os planos com o mapeamento:

```sql
-- Tabela Plan
SELECT * FROM "Plan" WHERE "hotmartOfferKey" = '9dv1fqir';

-- Retorna:
-- id: uuid-123
-- name: "Plano Profissional | Mensal"
-- stripePriceId: "price_hotmart_mensal"
-- hotmartOfferKey: "9dv1fqir"  ← Mapeamento!
-- amount: 3990
-- currency: "BRL"
-- interval: "MONTH"
-- trialPeriodDays: null
```

## Como os Planos são Sincronizados?

Os planos são sincronizados manualmente através do script `sync-hotmart-plans.ts`:

```bash
npm run sync-hotmart-plans
```

Este script:
1. Lê a lista de planos definida no código
2. Para cada plano, faz `upsert` no banco:
   - Se o plano já existe (por `stripePriceId` ou `hotmartOfferKey`), atualiza
   - Se não existe, cria novo

**Importante:** Este script deve ser executado sempre que novos planos forem adicionados na Hotmart.

## Variáveis de Ambiente Necessárias

Para o webhook funcionar, você precisa configurar no Vercel:

- `HOTMART_MEDIZ_PRODUCT_ID` - ID do produto na Hotmart (filtra webhooks)
- `HOTMART_WEBHOOK_SECRET` - Secret para validar webhooks (opcional, mas recomendado)

**NÃO precisa** de variáveis para cada plano individual, pois os planos são armazenados no banco de dados.

## Resumo

1. **Hotmart → Nossa API**: Hotmart envia webhook HTTP quando algo acontece
2. **Nossa API → Banco**: API busca o plano no banco usando o `offerCode` recebido
3. **Banco → Nossa API**: Retorna o plano encontrado
4. **Nossa API → Banco**: Salva/atualiza a assinatura do usuário

**Não há conexão direta** entre o banco e a Hotmart. Tudo passa pela nossa API que atua como intermediária.


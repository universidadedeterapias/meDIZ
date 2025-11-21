# Por que a API Precisa Estar Online para Receber Webhooks?

## Resposta Curta

**Sim!** A API só recebe webhooks da Hotmart porque está **online e acessível publicamente** na Vercel. Webhooks são requisições HTTP que a Hotmart faz **para** nossa API, então nossa API precisa estar "ouvindo" na internet.

## Como Funciona

### 1. Webhooks são Requisições HTTP Inversas

Diferente de uma API tradicional onde **você** faz requisições para um servidor externo, webhooks funcionam ao contrário:

```
┌─────────────────────────────────────────────────┐
│  Fluxo Normal (API tradicional)                 │
│                                                 │
│  Seu App → HTTP GET/POST → Servidor Externo    │
│  (você inicia a requisição)                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Fluxo Webhook (inverso)                       │
│                                                 │
│  Servidor Externo → HTTP POST → Seu App        │
│  (servidor externo inicia a requisição)        │
└─────────────────────────────────────────────────┘
```

### 2. A Hotmart Precisa de uma URL Pública

Para enviar webhooks, a Hotmart precisa saber **onde** enviar. Isso significa:

1. **URL pública**: `https://seudominio.com/api/hotmart`
2. **Acessível na internet**: Não pode ser `localhost` ou IP privado
3. **HTTPS obrigatório**: A maioria dos serviços exige HTTPS
4. **Configurada no painel da Hotmart**: Você precisa cadastrar essa URL no painel da Hotmart

### 3. Configuração no Painel da Hotmart

No painel administrativo da Hotmart, você precisa configurar:

```
URL do Webhook: https://seudominio.vercel.app/api/hotmart
Método: POST
Eventos: PURCHASE_APPROVED, SUBSCRIPTION_CANCELLED, etc.
```

Quando algo acontece na Hotmart (compra aprovada, cancelamento, etc.), ela automaticamente faz uma requisição HTTP POST para essa URL.

## Por que Vercel Funciona?

### ✅ Vercel Fornece URL Pública Automaticamente

Quando você faz deploy na Vercel, você automaticamente recebe:

- **URL de produção**: `https://seudominio.vercel.app`
- **HTTPS**: Configurado automaticamente
- **Acessível globalmente**: Qualquer servidor na internet pode acessar
- **Sempre online**: (exceto durante deploys)

### ❌ Desenvolvimento Local NÃO Funciona

Se você rodar `npm run dev` localmente:

```
❌ http://localhost:3000/api/hotmart
```

**Problemas:**
- `localhost` não é acessível pela internet
- A Hotmart não consegue fazer requisições para seu computador
- Não tem HTTPS (a maioria dos serviços exige)

### 🔧 Solução para Desenvolvimento Local

Para testar webhooks localmente, você precisa de um túnel:

#### Opção 1: ngrok (Recomendado)

```bash
# 1. Instalar ngrok
npm install -g ngrok

# 2. Rodar sua aplicação local
npm run dev

# 3. Em outro terminal, criar túnel
ngrok http 3000

# 4. Você recebe uma URL pública temporária:
# https://abc123.ngrok.io → redireciona para localhost:3000

# 5. Configurar essa URL no painel da Hotmart (temporariamente)
```

#### Opção 2: Vercel Preview Deployments

A Vercel cria automaticamente preview deployments para cada PR:

```
https://meDIZ-git-feature-branch.vercel.app
```

Você pode usar essa URL para testar webhooks em desenvolvimento.

## Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│  1. DEPLOY NA VERCEL                                        │
│     → https://seudominio.vercel.app/api/hotmart            │
│     → URL pública e acessível                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CONFIGURAR NO PAINEL DA HOTMART                         │
│     → URL do Webhook: https://seudominio.vercel.app/api/hotmart│
│     → Eventos: PURCHASE_APPROVED, etc.                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. EVENTO ACONTECE NA HOTMART                              │
│     → Cliente faz compra                                    │
│     → Hotmart processa pagamento                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. HOTMART ENVIA WEBHOOK                                   │
│     → HTTP POST para https://seudominio.vercel.app/api/hotmart│
│     → Payload: { event: "PURCHASE_APPROVED", data: {...} } │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. NOSSA API RECEBE E PROCESSA                            │
│     → src/app/api/hotmart/route.ts                         │
│     → Valida payload                                        │
│     → Busca plano no banco                                 │
│     → Cria/atualiza assinatura                              │
└─────────────────────────────────────────────────────────────┘
```

## Verificando se Está Funcionando

### 1. Verificar Logs da Vercel

Acesse o dashboard da Vercel → Deployments → Logs

Você deve ver requisições POST para `/api/hotmart` quando eventos acontecem.

### 2. Verificar Logs da Aplicação

O arquivo `src/app/api/hotmart/route.ts` tem logs detalhados:

```typescript
log('========== NOVO WEBHOOK RECEBIDO ==========')
log('Evento:', parsed.event)
log('Status da compra:', parsed.data.purchase.status)
```

### 3. Testar Manualmente (Desenvolvimento)

Você pode simular um webhook localmente:

```bash
curl -X POST http://localhost:3000/api/hotmart \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PURCHASE_APPROVED",
    "data": {
      "purchase": {
        "offer": { "code": "9dv1fqir" },
        "buyer": { "email": "teste@example.com" },
        "status": "APPROVED"
      }
    }
  }'
```

## Resumo

| Ambiente | URL | Funciona? | Por quê? |
|----------|-----|-----------|----------|
| **Vercel (Produção)** | `https://seudominio.vercel.app/api/hotmart` | ✅ **SIM** | URL pública, HTTPS, acessível globalmente |
| **Localhost** | `http://localhost:3000/api/hotmart` | ❌ **NÃO** | Não acessível pela internet |
| **Localhost + ngrok** | `https://abc123.ngrok.io/api/hotmart` | ✅ **SIM** | Túnel cria URL pública temporária |
| **Vercel Preview** | `https://meDIZ-git-branch.vercel.app/api/hotmart` | ✅ **SIM** | URL pública temporária para PRs |

## Conclusão

**A API só recebe webhooks porque está online na Vercel.** Sem uma URL pública e acessível, a Hotmart não consegue enviar os webhooks. É por isso que:

1. ✅ Deploy na Vercel = Webhooks funcionam automaticamente
2. ❌ Apenas `npm run dev` = Webhooks não funcionam
3. 🔧 `npm run dev` + ngrok = Webhooks funcionam (para testes)


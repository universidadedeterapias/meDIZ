# Variáveis de Ambiente - Planos Hotmart e Stripe

## 📋 Variáveis OBRIGATÓRIAS para Vercel

### 🔴 Hotmart (Webhook) - OBRIGATÓRIA
```bash
HOTMART_MEDIZ_PRODUCT_ID=seu_product_id_aqui
```
- **Descrição:** ID do produto na Hotmart (filtra webhooks para processar apenas compras do produto correto)
- **Onde encontrar:** Dashboard Hotmart → Produtos → ID do produto
- **Status:** ⚠️ **OBRIGATÓRIA** - Sem isso, o webhook não processa compras
- **Ação:** ✅ **CONFIGURAR/VERIFICAR** na Vercel

---

### 🔴 Stripe (Webhook) - OBRIGATÓRIAS
```bash
STRIPE_SECRET_KEY=sk_live_...ou_sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
- **Descrição:** 
  - `STRIPE_SECRET_KEY`: Chave secreta da API do Stripe
  - `STRIPE_WEBHOOK_SECRET`: Secret do webhook do Stripe (para validar assinaturas)
- **Onde encontrar:** 
  - Dashboard Stripe → Developers → API keys
  - Dashboard Stripe → Developers → Webhooks → Adicionar endpoint → Copiar "Signing secret"
- **Status:** ⚠️ **OBRIGATÓRIAS** - Sem isso, checkout e webhooks do Stripe não funcionam
- **Ação:** ✅ **CONFIGURAR/VERIFICAR** na Vercel

---

## 📋 Variáveis OPCIONAIS (Legadas)

### ⚪ Hotmart - Planos (Legado - Não são mais necessárias)
Estas variáveis são usadas apenas pelo script legado `seed-hotmart-plans.ts` e **NÃO são mais necessárias** para o funcionamento do webhook principal, pois os planos agora são armazenados no banco de dados.

```bash
# Opcional - Pode manter se já estiver configurado
HOTMART_MONTHLY_PRICE_CODE=price_hotmart_mensal
HOTMART_YEARLY_PRICE_CODE=price_hotmart_anual

# Opcional - Nomes dos planos (fallback)
HOTMART_MONTHLY_PLAN_NAME=Assin Mensal 30D|free
HOTMART_YEARLY_PLAN_NAME=meDIZ Assin Anual 30D - Free

# Opcional - Valores em centavos (para exibição no admin)
HOTMART_MONTHLY_AMOUNT=3990
HOTMART_YEARLY_AMOUNT=35880
```

**⚠️ IMPORTANTE:** O webhook principal (`/api/hotmart`) **NÃO usa essas variáveis**. Ele busca planos por:
1. `hotmartOfferKey` (sistema novo - mais preciso)
2. Códigos hardcoded `price_hotmart_mensal` e `price_hotmart_anual` (fallback)
3. Intervalo (YEAR/MONTH) como último recurso

---

## 📋 Outras Variáveis Necessárias (Não relacionadas a planos)

### Banco de Dados
```bash
DATABASE_URL=postgresql://usuario:senha@host:porta/database
```

### NextAuth
```bash
NEXTAUTH_SECRET=seu_secret_aqui
NEXTAUTH_URL=https://seu-dominio.vercel.app
```

### Google OAuth (se usar)
```bash
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
```

### Cloudinary (se usar upload de imagens)
```bash
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=seu_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

### App URL
```bash
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

---

## 🎯 Resumo para Vercel

### Variáveis MÍNIMAS necessárias para planos funcionarem:

1. ✅ **HOTMART_MEDIZ_PRODUCT_ID** (obrigatória) - **CONFIGURAR/VERIFICAR**
2. ✅ **STRIPE_SECRET_KEY** (obrigatória) - **CONFIGURAR/VERIFICAR**
3. ✅ **STRIPE_WEBHOOK_SECRET** (obrigatória) - **CONFIGURAR/VERIFICAR**

### Como os planos funcionam agora:

1. **Planos são armazenados no banco de dados** (não em variáveis de ambiente)
2. **Webhook identifica planos por:**
   - **Prioridade 1:** `hotmartId` (ID numérico: 1115304, 1115305, etc.) - **MAIS CONFIÁVEL** ✅
   - **Prioridade 2:** `hotmartOfferKey` (código alfanumérico: "jcuheq2m", etc.)
   - **Prioridade 3:** Códigos conhecidos (fallback)
3. **Sincronização:** Execute `npm run sync-hotmart-plans` após deploy ou quando novos planos forem adicionados

---

## 📝 Planos Configurados no Banco

Os seguintes planos estão sincronizados no banco (via `sync-hotmart-plans.ts`):

### Planos BRL (Real Brasileiro)
- **ID:** `1115304` | **OfferKey:** `9dv1fqir` - Plano Profissional | Mensal (R$ 39,90/mês)
- **ID:** `1115305` | **OfferKey:** `5zwrxs0n` - PLANO PROFISSIONAL - MENSAL c/ 30D Experiência (R$ 39,90/mês + 30 dias trial)
- **ID:** `1163392` | **OfferKey:** `b24v0i4q` - Plano 1 Real (R$ 39,90/mês + 30 dias trial)
- **ID:** `1115306` | **OfferKey:** `jcuheq2m` - PLANO PROFISSIONAL - ANUAL (R$ 358,80/ano) ⚠️ **YEAR**
- **ID:** `1115307` | **OfferKey:** `2icona9m` - PLANO PROFISSIONAL | ANUAL | C/ 30D GRATUITOS (R$ 358,80/ano + 30 dias trial) ⚠️ **YEAR**

### Planos USD (Dólar)
- **ID:** `1197626` | **OfferKey:** `qhs594oc` - Plano Mensal - Dólar ($ 9,90/mês)
- **ID:** `1197627` | **OfferKey:** `i7m8kqyw` - Plano Anual - Dólar ($ 97,00/ano) ⚠️ **YEAR**

**Nota:** O webhook agora busca primeiro pelo `hotmartId` (ID numérico), que é mais confiável que o `offerKey`.

---

## 🔧 Como Sincronizar Planos

Se novos planos forem adicionados na Hotmart, execute:

```bash
npm run sync-hotmart-plans
```

Este script:
- ✅ Cria novos planos se não existirem
- ✅ Atualiza planos existentes com novos dados
- ✅ Garante que `interval = YEAR` para planos anuais
- ✅ Mantém compatibilidade com planos antigos

---

## ✅ Checklist para Vercel - O QUE VOCÊ PRECISA FAZER

### 🔴 Variáveis OBRIGATÓRIAS (Configurar/Verificar):

- [ ] **`HOTMART_MEDIZ_PRODUCT_ID`** - ID do produto na Hotmart
- [ ] **`STRIPE_SECRET_KEY`** - Chave secreta da API Stripe
- [ ] **`STRIPE_WEBHOOK_SECRET`** - Secret do webhook Stripe

### 🟡 Variáveis de Infraestrutura (Verificar se já estão configuradas):

- [ ] `DATABASE_URL` - URL de conexão do PostgreSQL
- [ ] `NEXTAUTH_SECRET` - Secret para NextAuth
- [ ] `NEXTAUTH_URL` - URL da aplicação (ex: https://seu-dominio.vercel.app)
- [ ] `NEXT_PUBLIC_APP_URL` - URL pública da aplicação

### 🟢 Variáveis Opcionais (Se usar):

- [ ] `GOOGLE_CLIENT_ID` - Se usar login Google
- [ ] `GOOGLE_CLIENT_SECRET` - Se usar login Google
- [ ] `CLOUDINARY_CLOUD_NAME` - Se usar upload de imagens
- [ ] `CLOUDINARY_API_KEY` - Se usar upload de imagens
- [ ] `CLOUDINARY_API_SECRET` - Se usar upload de imagens

### 📝 Após Deploy:

- [ ] Migration `20250122120000_add_hotmart_id` será aplicada automaticamente
- [ ] Execute `npm run sync-hotmart-plans` (localmente ou via script) para preencher `hotmartId` nos planos

---

## 🐛 Troubleshooting

### Webhook não encontra plano
1. Verifique se o `hotmartId` ou `offerKey` está mapeado no banco: `npm run verify-hotmart-plans`
2. Execute `npm run sync-hotmart-plans` para sincronizar
3. Verifique os logs do webhook para ver qual `hotmartId` ou `offerKey` foi recebido

### Planos anuais aparecem como mensais
1. Execute `npm run verify-hotmart-plans` para verificar se `interval = YEAR`
2. Se estiver incorreto, execute `npm run sync-hotmart-plans` para corrigir
3. Verifique se o `hotmartId` está correto no banco

### Webhook retorna erro "HOTMART_MEDIZ_PRODUCT_ID not configured"
- Configure a variável `HOTMART_MEDIZ_PRODUCT_ID` na Vercel
- Faça um novo deploy ou aguarde a propagação das variáveis

### Migration não foi aplicada
- Verifique se a migration `20250122120000_add_hotmart_id` foi aplicada
- Se não, execute manualmente o SQL (veja `docs/APLICAR_MIGRATION_HOTMART_ID.md`)
- Depois execute `npm run sync-hotmart-plans` para preencher os IDs

---

## 📌 RESUMO EXECUTIVO - O QUE FAZER NA VERCEL

### 1. Variáveis OBRIGATÓRIAS (Configurar/Verificar):
```bash
HOTMART_MEDIZ_PRODUCT_ID=seu_product_id
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Após Deploy:
- A migration será aplicada automaticamente
- Execute `npm run sync-hotmart-plans` para preencher `hotmartId` nos planos

### 3. Verificar:
- Execute `npm run verify-hotmart-plans` para confirmar que tudo está correto


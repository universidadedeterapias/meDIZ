# 🔍 Endpoints para Monitoramento - ExemploApp

## ✅ Endpoint de Health Check (Recomendado)

### GET `/api/health`

**Sem autenticação necessária** - Ideal para monitoramento externo

**Resposta de Sucesso (200):**
```json
{
  "status": "online",
  "timestamp": "2025-10-31T20:00:00.000Z",
  "services": {
    "openai": true,
    "database": true,
    "auth": true
  },
  "version": "0.1.0"
}
```

**Resposta de Erro (503):**
```json
{
  "status": "online",
  "timestamp": "2025-10-31T20:00:00.000Z",
  "services": {
    "openai": false,  // ← Serviço com problema
    "database": true,
    "auth": true
  },
  "version": "0.1.0"
}
```

**Use este endpoint para:**
- Monitoramento de uptime
- Verificação de saúde dos serviços
- Alertas automáticos

---

## ⚠️ Endpoints que NÃO devem ser monitorados diretamente

### `/api/openai` (POST)
**Problemas:**
- ❌ Requer autenticação (cookies de sessão)
- ❌ Requer body: `{ message: string }`
- ❌ Timeout de até 60s (pode ser lento)
- ❌ Consome recursos da OpenAI

**Solução:** Use `/api/health` que verifica se o serviço está configurado

### `/api/auth/signup` (POST)
**Problemas:**
- ❌ Requer body: `{ email, password }`
- ❌ Pode criar usuários indesejados em testes
- ❌ Valida se email já existe

**Solução:** Use `/api/health` para verificar se auth está configurado

---

## 📝 URLs Corretas para Monitoramento

### ✅ Use estas URLs:

```bash
# Health Check (RECOMENDADO)
GET https://exemplo-app.vercel.app/api/health

# Verifica apenas se a aplicação está online
GET https://exemplo-app.vercel.app
```

### ❌ NÃO use estas URLs:

```bash
# ❌ URL incorreta (tem /POST/ na URL)
POST https://exemplo-app.vercel.app/POST/api/auth/signup

# ❌ Endpoint que requer autenticação
POST https://exemplo-app.vercel.app/api/openai

# ✅ URLs corretas (mas não para monitoramento simples)
POST https://exemplo-app.vercel.app/api/auth/signup
POST https://exemplo-app.vercel.app/api/openai  (com auth)
```

---

## 🔧 Configuração Recomendada para Monitoramento

### Para serviços como UptimeRobot, Pingdom, etc:

1. **URL:** `https://exemplo-app.vercel.app/api/health`
2. **Método:** `GET`
3. **Intervalo:** A cada 5 minutos
4. **Timeout:** 10 segundos
5. **Esperar Status:** `200 OK`
6. **Alertar se:** Status diferente de `200` OU `services.openai === false`

### Exemplo de configuração:

```yaml
monitor:
  name: "ExemploApp Health Check"
  url: "https://exemplo-app.vercel.app/api/health"
  method: GET
  expected_status: 200
  timeout: 10s
  check_interval: 5m
  alert_if:
    - status_code != 200
    - json.services.openai == false
    - json.services.database == false
```

---

## 🐛 Troubleshooting

### Se `/api/health` retornar 503:

1. **Verificar variáveis de ambiente na plataforma de deploy:**
   - `N8N_CHAT_WEBHOOK_URL` está configurada?
   - `DATABASE_URL` está configurada?
   - `NEXTAUTH_SECRET` está configurada?

2. **Verificar logs da plataforma de deploy:**
   - Acesse o dashboard da plataforma → Logs
   - Procure por erros relacionados aos serviços

3. **Testar manualmente:**
```bash
curl https://exemplo-app.vercel.app/api/health
```

### Se endpoint ainda estiver "Offline":

1. **Verificar se a URL está correta** (sem `/POST/`)
2. **Verificar se o método HTTP está correto** (GET, não POST)
3. **Verificar se não há redirecionamento** (HTTP → HTTPS)
4. **Verificar se não há bloqueio por firewall** no serviço de monitoramento

---

## 📊 Métricas Adicionais (Opcional)

Se quiser monitorar endpoints específicos **com autenticação**, crie um endpoint de teste:

```typescript
// src/app/api/admin/test/route.ts
// Endpoint de teste para admins (requer auth)

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email?.includes('@exemplo.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    user: session.user.email
  })
}
```

**URL:** `GET /api/admin/test` (com cookies de sessão admin)


# 🚀 Configuração de Notificações para Produção

Este guia explica como configurar o sistema de notificações push para funcionar em produção na Vercel.

## 📋 Pré-requisitos

1. ✅ Chaves VAPID geradas e configuradas
2. ✅ Banco de dados PostgreSQL configurado
3. ✅ Variáveis de ambiente básicas configuradas
4. ✅ Projeto deployado na Vercel

## 🔧 Configuração Passo a Passo

### 1. Configurar Variáveis de Ambiente na Vercel

Acesse o dashboard da Vercel e configure as seguintes variáveis de ambiente:

#### Variáveis Obrigatórias

```env
# Chaves VAPID (já devem estar configuradas)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<sua_chave_publica>
VAPID_PRIVATE_KEY=<sua_chave_privada>
VAPID_CONTACT_EMAIL=noreply@mediz.app

# Secret para autenticação do cron job
CRON_SECRET=<uma_string_secreta_aleatoria_e_segura>
```

**⚠️ IMPORTANTE:**
- `CRON_SECRET` deve ser uma string aleatória e segura (mínimo 32 caracteres)
- Você pode gerar uma usando: `openssl rand -base64 32`
- **NÃO compartilhe** este secret publicamente

#### Como Adicionar Variáveis na Vercel

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** > **Environment Variables**
3. Adicione cada variável:
   - **Name**: Nome da variável (ex: `CRON_SECRET`)
   - **Value**: Valor da variável
   - **Environment**: Selecione **Production** (e **Preview** se quiser testar)
4. Clique em **Save**

### 2. Configurar Cron Job na Vercel

O cron job já está configurado no arquivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/push/check-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

**O que isso significa:**
- **Path**: `/api/push/check-reminders` - Endpoint que será chamado
- **Schedule**: `* * * * *` - Executa **a cada minuto**

**Por que a cada minuto?**
- Os lembretes são agendados por horário exato (ex: 21:30)
- O cron precisa executar no minuto exato para encontrar os lembretes
- Executar a cada minuto garante que nenhum lembrete seja perdido

#### Verificar Configuração do Cron

1. Acesse seu projeto no Vercel Dashboard
2. Vá em **Settings** > **Cron Jobs**
3. Você deve ver o cron job listado:
   - **Path**: `/api/push/check-reminders`
   - **Schedule**: `* * * * *` (Every minute)
   - **Status**: Ativo

### 3. Como o Sistema Funciona

#### Autenticação do Cron Job

O endpoint `/api/push/check-reminders` aceita autenticação de duas formas:

1. **Vercel Cron (Automático)**: 
   - O Vercel envia automaticamente o header `x-vercel-cron: 1`
   - O sistema detecta isso e permite a execução

2. **Secret Manual (Query Parameter)**:
   - Para testes ou chamadas manuais: `/api/push/check-reminders?secret=<CRON_SECRET>`
   - Útil para debug ou chamadas externas

3. **Admin (Fallback)**:
   - Se não for cron, verifica se o usuário é admin
   - Permite que admins testem manualmente

#### Fluxo de Execução

1. **Cron executa** a cada minuto
2. **Busca lembretes** com `active: true` e `time: "HH:mm"` (horário atual)
3. **Verifica dia da semana** - só envia se o dia atual está nos `daysOfWeek`
4. **Verifica duplicatas** - não envia se já foi enviado hoje (`lastSentAt`)
5. **Envia notificações** para os usuários com subscriptions ativas
6. **Atualiza `lastSentAt`** para evitar duplicatas

### 4. Testar em Produção

#### Teste Manual (Admin)

1. Faça login como admin (`@mediz.com`)
2. Acesse: `https://seu-dominio.com/api/push/check-reminders`
3. Você deve ver a resposta JSON com os resultados

#### Teste com Secret

```bash
curl "https://seu-dominio.com/api/push/check-reminders?secret=<SEU_CRON_SECRET>"
```

#### Verificar Logs

1. Acesse o Vercel Dashboard
2. Vá em **Deployments** > Selecione o deployment mais recente
3. Clique em **Functions** > `/api/push/check-reminders`
4. Veja os logs de execução

### 5. Monitoramento

#### Verificar Execução do Cron

1. Vercel Dashboard > **Settings** > **Cron Jobs**
2. Clique no cron job para ver histórico de execuções
3. Verifique:
   - ✅ Última execução
   - ✅ Status (sucesso/erro)
   - ✅ Tempo de execução

#### Verificar Notificações Enviadas

Os logs do endpoint incluem:
- Quantidade de lembretes verificados
- Quantidade de notificações enviadas
- Quantidade de falhas
- Lista de erros (se houver)

Exemplo de resposta:
```json
{
  "success": true,
  "timestamp": "2024-01-15T21:30:00.000Z",
  "checked": 5,
  "sent": 3,
  "failed": 2,
  "errors": ["Lembrete 123: Usuário não tem subscriptions"]
}
```

## 🔒 Segurança

### Proteção do Endpoint

- ✅ Autenticação via header `x-vercel-cron` (automático do Vercel)
- ✅ Autenticação via `CRON_SECRET` (para chamadas manuais)
- ✅ Fallback para admin (apenas para testes)
- ✅ Logs não expõem valores de secrets

### Boas Práticas

1. **Nunca commite** o `CRON_SECRET` no código
2. **Use variáveis de ambiente** sempre
3. **Gere um secret forte** (mínimo 32 caracteres)
4. **Rotacione o secret** periodicamente se necessário

## 🐛 Troubleshooting

### Cron não executa

**Sintomas:**
- Notificações não chegam no horário agendado
- Logs não mostram execuções

**Soluções:**
1. Verifique se o cron está ativo no Vercel Dashboard
2. Verifique se o `vercel.json` está commitado
3. Verifique os logs do deployment
4. Teste manualmente com o secret

### Notificações não chegam

**Sintomas:**
- Cron executa mas `sent: 0`
- Logs mostram "Nenhuma subscription ativa"

**Soluções:**
1. Verifique se usuários têm subscriptions registradas
2. Verifique se as chaves VAPID estão corretas
3. Verifique se usuários permitiram notificações no navegador
4. Verifique logs de erro específicos

### Erro de autenticação

**Sintomas:**
- Resposta `401 Unauthorized` ou `403 Forbidden`
- Logs mostram "Não autenticado"

**Soluções:**
1. Verifique se `CRON_SECRET` está configurado na Vercel
2. Verifique se o secret usado na chamada manual está correto
3. Verifique se está usando o header correto (Vercel Cron automático)

### Timeout

**Sintomas:**
- Resposta `408 Request Timeout`
- Logs mostram "Processamento demorou muito"

**Soluções:**
1. O endpoint tem `maxDuration: 300` (5 minutos)
2. Se houver muitos lembretes globais, considere processar em batches menores
3. Verifique se há problemas de performance no banco de dados

## 📊 Otimizações Futuras

- [ ] Processar lembretes globais em background jobs
- [ ] Cache de subscriptions ativas
- [ ] Retry automático para falhas
- [ ] Dashboard de analytics de notificações
- [ ] Alertas quando cron falha

## 📚 Referências

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Keys](https://web.dev/push-notifications-web-push-protocol/)

---

**Última atualização:** Janeiro 2024



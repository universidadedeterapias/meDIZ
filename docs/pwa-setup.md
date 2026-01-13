# Configuração PWA e Notificações Push

## Visão Geral

A aplicação meDIZ foi transformada em PWA (Progressive Web App) com suporte completo a notificações push, permitindo que os usuários recebam lembretes personalizados mesmo com o app fechado.

## Funcionalidades Implementadas

1. **PWA Base**
   - Manifest.json configurado
   - Service Worker registrado
   - Suporte a instalação no dispositivo

2. **Notificações Push**
   - Suporte completo a Web Push Protocol
   - Compatível com iOS (16.4+), Android, Chrome, Firefox, Edge
   - Banner automático para solicitar permissão

3. **Sistema de Lembretes**
   - Interface para criar/editar/deletar lembretes
   - Agendamento por horário e dias da semana
   - Ativação/desativação de lembretes

4. **Backend**
   - APIs RESTful para gerenciar subscriptions e lembretes
   - Cron job para verificar e enviar lembretes agendados
   - Armazenamento no banco de dados (Prisma)

## Configuração Inicial

### 1. Gerar Chaves VAPID

Execute o script para gerar as chaves VAPID:

```bash
npm run generate-vapid-keys
```

Isso gerará duas chaves que você precisa adicionar ao seu arquivo `.env`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<chave_publica_gerada>
VAPID_PRIVATE_KEY=<chave_privada_gerada>
VAPID_CONTACT_EMAIL=noreply@mediz.app
CRON_SECRET=<uma_string_secreta_aleatoria>
```

**⚠️ IMPORTANTE:**
- `VAPID_PRIVATE_KEY` deve ser mantida em segredo
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` pode ser pública (é usada no frontend)
- `CRON_SECRET` é usado para proteger o endpoint de cron job

### 2. Aplicar Migration do Banco de Dados

Execute a migration para criar as tabelas necessárias:

```bash
npx prisma migrate dev
```

Isso criará as tabelas:
- `push_subscriptions` - Armazena subscriptions de notificações push
- `reminders` - Armazena lembretes agendados pelos usuários

### 3. Configurar Cron Job (Vercel)

O cron job está configurado no `vercel.json` para executar a cada minuto e verificar lembretes agendados.

**Para produção na Vercel:**

1. Acesse o dashboard da Vercel
2. Vá em Settings > Cron Jobs
3. Configure o cron job com:
   - Path: `/api/push/check-reminders?secret=<SEU_CRON_SECRET>`
   - Schedule: `* * * * *` (a cada minuto)

**Alternativa:** Você pode chamar manualmente o endpoint:

```bash
curl https://seu-dominio.com/api/push/check-reminders?secret=<SEU_CRON_SECRET>
```

## Estrutura de Arquivos

```
public/
  ├── manifest.json          # Manifest PWA
  └── sw.js                   # Service Worker

src/
  ├── app/
  │   ├── api/
  │   │   └── push/
  │   │       ├── subscribe/route.ts          # Registrar subscription
  │   │       ├── unsubscribe/route.ts        # Remover subscription
  │   │       ├── reminders/route.ts         # CRUD de lembretes
  │   │       ├── send/route.ts              # Enviar notificação (admin)
  │   │       ├── check-reminders/route.ts   # Cron job para lembretes
  │   │       └── vapid-public-key/route.ts  # Obter chave pública
  │   └── account/
  │       └── reminders/page.tsx            # Interface de lembretes
  ├── components/
  │   ├── PushNotificationBanner.tsx         # Banner de permissão
  │   └── ServiceWorkerRegistration.tsx     # Registro do SW
  ├── hooks/
  │   └── usePushNotifications.ts            # Hook para gerenciar push
  └── lib/
      └── webPush.ts                         # Utilitário de envio

prisma/
  └── schema.prisma                          # Modelos PushSubscription e Reminder
```

## Uso

### Para Usuários

1. **Ativar Notificações:**
   - Um banner aparecerá automaticamente após alguns segundos
   - Clique em "Ativar notificações" e permita no navegador

2. **Criar Lembretes:**
   - Acesse `/account/reminders`
   - Clique em "Novo lembrete"
   - Configure título, mensagem, horário e dias da semana
   - Salve o lembrete

3. **Gerenciar Lembretes:**
   - Ative/desative lembretes com o switch
   - Edite ou exclua lembretes existentes

### Para Administradores

**Enviar Notificação Manual:**

```bash
curl -X POST https://seu-dominio.com/api/push/send \
  -H "Content-Type: application/json" \
  -H "Cookie: <seu_cookie_de_sessao>" \
  -d '{
    "userId": "user-id",
    "title": "Título da notificação",
    "body": "Mensagem da notificação",
    "url": "/chat"
  }'
```

## Compatibilidade

- ✅ Chrome/Edge (Desktop e Android)
- ✅ Firefox (Desktop e Android)
- ✅ Safari iOS 16.4+
- ✅ Opera
- ❌ Safari Desktop (não suporta Web Push API)

## Troubleshooting

### Notificações não aparecem

1. Verifique se as VAPID keys estão configuradas corretamente
2. Verifique se o usuário permitiu notificações no navegador
3. Verifique se há subscriptions registradas no banco
4. Verifique os logs do servidor para erros

### Cron job não executa

1. Verifique se o `CRON_SECRET` está configurado
2. Verifique se o cron job está configurado na Vercel
3. Teste manualmente chamando o endpoint com o secret correto

### Service Worker não registra

1. Verifique se está em HTTPS (obrigatório para PWA)
2. Verifique se o arquivo `sw.js` está acessível em `/sw.js`
3. Verifique o console do navegador para erros

## Próximos Passos

- [ ] Dashboard de analytics de notificações
- [ ] Personalização de notificações pela IA
- [ ] Templates de notificações
- [ ] Histórico de notificações enviadas
- [ ] Notificações baseadas em eventos (ex: nova mensagem no chat)







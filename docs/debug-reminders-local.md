# Debug de Lembretes - Ambiente Local

Este guia explica como debugar o sistema de lembretes localmente.

## Pré-requisitos

1. **Servidor Next.js rodando:**
   ```bash
   npm run dev
   ```

2. **Variável de ambiente CRON_SECRET configurada:**
   No arquivo `.env.local`, adicione:
   ```env
   CRON_SECRET=local-dev-secret
   ```
   (Ou qualquer string secreta que você quiser usar)

## Scripts Disponíveis

### 1. Verificar Estado do Sistema
```bash
npm run debug-reminders
```

Este script mostra:
- ✅ Se VAPID keys estão configuradas
- 📅 Horário atual e timezone
- 📊 Todos os lembretes no banco
- 🎯 Lembretes que deveriam ser enviados agora
- 👥 Subscriptions registradas
- ⚠️ Problemas encontrados

**Use este primeiro** para entender o estado atual do sistema.

### 2. Testar Endpoint Manualmente
```bash
npm run test-check-reminders
```

Este script:
- Chama o endpoint `/api/push/check-reminders`
- Mostra a resposta completa
- Exibe todos os logs de debug detalhados

**Use este** para ver exatamente o que acontece quando o endpoint é chamado.

### 3. Executar Verificação (Simular Cron)
```bash
npm run check-reminders-local
```

Este script:
- Simula o que o cron job faria
- Executa a verificação de lembretes
- Mostra resultado resumido
- Funciona mesmo sem estar logado como admin

**Use este** para testar o fluxo completo de verificação.

### 4. Modo Watch (Executar Continuamente)
```bash
npm run check-reminders-local -- --watch
```

Este script:
- Executa a verificação imediatamente
- Depois executa a cada 1 minuto automaticamente
- Útil para testar lembretes agendados

**Use este** para simular o cron job rodando continuamente.

## Fluxo de Debug Recomendado

### Passo 1: Verificar Estado
```bash
npm run debug-reminders
```

Verifique:
- ✅ Há lembretes ativos?
- ✅ O horário está correto?
- ✅ Há subscriptions registradas?
- ✅ VAPID keys estão configuradas?

### Passo 2: Criar/Verificar Lembrete
1. Acesse o painel admin: `http://localhost:3000/admin/reminders`
2. Crie um lembrete para o horário atual (ex: se são 14:30, crie para 14:31)
3. Verifique se está ativo e nos dias corretos

### Passo 3: Testar Endpoint
```bash
npm run test-check-reminders
```

Analise os logs para ver:
- Se o lembrete foi encontrado
- Se passou nas verificações (dia da semana, lastSentAt)
- Se tentou enviar notificação
- Qual foi o resultado

### Passo 4: Executar Verificação
```bash
npm run check-reminders-local
```

Veja se a notificação foi enviada com sucesso.

## Problemas Comuns

### ❌ "Nenhum lembrete encontrado para o horário atual"
**Causa:** O horário do lembrete não bate exatamente com o horário atual.

**Solução:**
- Crie um lembrete para o horário atual (ex: 14:30 se são 14:30)
- Ou aguarde até o horário do lembrete chegar
- Ou use o modo watch para testar automaticamente

### ❌ "Usuário não tem subscriptions registradas"
**Causa:** O usuário não permitiu notificações no navegador.

**Solução:**
1. Acesse a aplicação no navegador
2. Permita notificações quando solicitado
3. Verifique se a subscription foi registrada: `npm run debug-reminders`

### ❌ "VAPID keys não configuradas"
**Causa:** As chaves VAPID não estão no `.env.local`.

**Solução:**
1. Execute: `npm run generate-vapid-keys`
2. Adicione as chaves ao `.env.local`:
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_CONTACT_EMAIL=noreply@mediz.app
   ```
3. Reinicie o servidor: `npm run dev`

### ❌ "Não é o dia certo"
**Causa:** O lembrete está configurado para outros dias da semana.

**Solução:**
- Verifique os dias da semana do lembrete no painel admin
- Certifique-se de que o dia atual está selecionado

### ❌ "Já foi enviado hoje"
**Causa:** O lembrete já foi enviado hoje e não será reenviado.

**Solução:**
- Aguarde até amanhã
- Ou limpe o campo `lastSentAt` no banco de dados (via Prisma Studio)

## Verificando Logs Detalhados

Todos os scripts mostram logs detalhados. Os logs incluem:

- 🔍 **Autenticação:** Como o endpoint foi autenticado
- 📅 **Tempo:** Horário atual, timezone, dia da semana
- 📊 **Lembretes:** Todos os lembretes encontrados
- ✅ **Verificações:** Se passou nas validações
- 📤 **Envio:** Tentativas de envio e resultados
- ❌ **Erros:** Detalhes de qualquer erro

## Testando Notificações Push

Para testar notificações push localmente:

1. **Permita notificações no navegador:**
   - Acesse `http://localhost:3000`
   - Quando solicitado, permita notificações

2. **Verifique se foi registrado:**
   ```bash
   npm run debug-reminders
   ```
   Deve mostrar subscriptions do seu usuário.

3. **Crie um lembrete:**
   - No painel admin, crie um lembrete para agora
   - Ou aguarde até o horário do lembrete

4. **Execute a verificação:**
   ```bash
   npm run check-reminders-local
   ```

5. **Verifique se recebeu:**
   - A notificação deve aparecer no navegador
   - Mesmo com a aba fechada (se o service worker estiver ativo)

## Dicas

- Use o modo watch para testar lembretes agendados: `npm run check-reminders-local -- --watch`
- Crie lembretes de teste para horários próximos (1-2 minutos no futuro)
- Verifique sempre os logs detalhados para entender o que está acontecendo
- Use Prisma Studio para verificar/editar dados diretamente: `npx prisma studio`




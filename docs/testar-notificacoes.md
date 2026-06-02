# 🧪 Guia Passo a Passo: Testar Notificações Push

Este guia explica como testar o sistema completo de notificações push, desde a ativação até o recebimento de um lembrete.

## 📋 Pré-requisitos

1. **Servidor Next.js rodando:**
   ```bash
   npm run dev
   ```

2. **VAPID keys configuradas:**
   ```bash
   npm run verify-vapid-key
   ```
   Deve mostrar: ✅ Chave convertida com sucesso

## 🚀 Passo a Passo Completo

### Passo 1: Verificar Estado Atual

Execute o script de debug para ver o estado atual:

```bash
npm run debug-reminders
```

**O que verificar:**
- ✅ VAPID keys configuradas: SIM
- 📊 Total de subscriptions: (quantas você tem)
- 📊 Total de lembretes: (quantos existem)

**Se não houver subscriptions:**
- Você precisa ativar as notificações primeiro (Passo 2)

**Se houver subscriptions:**
- Pode pular para o Passo 3

---

### Passo 2: Ativar Notificações (se ainda não ativou)

1. **Acesse a aplicação no navegador:**
   ```
   http://localhost:3000
   ```

2. **Faça login** (se necessário)

3. **Vá para a página de chat ou home:**
   - `/chat` ou `/`

4. **Aguarde o banner aparecer:**
   - Deve aparecer após 2 segundos
   - Se não aparecer, verifique o console do navegador (F12)

5. **Clique em "Ativar notificações":**
   - O navegador vai pedir permissão
   - Clique em "Permitir"

6. **Verifique se funcionou:**
   - O banner deve desaparecer
   - No console, deve aparecer: `✅ Subscription registrada no servidor`

7. **Confirme que foi salvo:**
   ```bash
   npm run debug-reminders
   ```
   Deve mostrar: `📊 Total de subscriptions: 1` (ou mais)

---

### Passo 3: Criar um Lembrete de Teste

1. **Acesse o painel admin:**
   ```
   http://localhost:3000/admin/reminders
   ```

2. **Clique em "Novo Lembrete"**

3. **Preencha os dados:**
   - **Título:** "Teste de Notificação"
   - **Mensagem:** "Esta é uma notificação de teste"
   - **Horário:** Use o horário atual + 1 minuto
     - Exemplo: Se são 21:20, coloque 21:21
   - **Dias da semana:** Selecione o dia atual
   - **Tipo:** GLOBAL (todos usuários) ou INDIVIDUAL (seu usuário)
   - **Ativo:** ✅ Deixe marcado

4. **Clique em "Criar"**

5. **Verifique se foi criado:**
   ```bash
   npm run debug-reminders
   ```
   Deve mostrar o lembrete na lista

---

### Passo 4: Testar Envio Imediato (Opcional)

Se você criou um lembrete para o horário atual, pode testar imediatamente:

1. **Certifique-se de que o servidor está rodando:**
   ```bash
   npm run dev
   ```

2. **Em outro terminal, execute:**
   ```bash
   npm run check-reminders-local
   ```

3. **Verifique o resultado:**
   - Deve mostrar: `📤 Notificações enviadas: 1` (ou mais)
   - A notificação deve aparecer no navegador

---

### Passo 5: Testar com Lembrete Agendado

1. **Crie um lembrete para daqui a 1-2 minutos:**
   - Exemplo: Se são 21:20, crie para 21:22

2. **Execute o script em modo watch:**
   ```bash
   npm run check-reminders-local -- --watch
   ```

3. **Aguarde até o horário:**
   - O script executa a cada 1 minuto
   - Quando chegar o horário, a notificação será enviada automaticamente

4. **Verifique se recebeu:**
   - A notificação deve aparecer no navegador
   - Mesmo com a aba fechada (se o service worker estiver ativo)

---

### Passo 6: Verificar Logs Detalhados

Se quiser ver todos os logs do processo:

1. **Execute o teste completo:**
   ```bash
   npm run test-check-reminders
   ```

2. **Isso mostra:**
   - Todos os logs de debug
   - Lembretes encontrados
   - Resultado de cada envio
   - Erros detalhados (se houver)

---

## 🔍 Troubleshooting

### Banner não aparece

**Verifique no console do navegador (F12):**
- `[PushNotificationBanner] 🔍 Verificando condições...`
- Veja quais condições não estão sendo atendidas

**Possíveis causas:**
- Não está em página válida (`/chat` ou `/`)
- Push não é suportado no navegador
- Já está inscrito (verifique com `npm run debug-reminders`)

### Erro "Registration failed - push service error"

**Soluções:**
1. Verifique a chave VAPID:
   ```bash
   npm run verify-vapid-key
   ```

2. Verifique o service worker:
   - DevTools (F12) → Application → Service Workers
   - Deve estar "activated and is running"

3. Tente limpar e recarregar:
   - DevTools → Application → Service Workers → Unregister
   - Recarregue a página

### Notificação não chega

**Verifique:**
1. Se há subscription registrada:
   ```bash
   npm run debug-reminders
   ```

2. Se o lembrete está no horário correto:
   - O horário deve bater exatamente (ex: 21:20 = 21:20)

3. Se o lembrete está ativo:
   - Verifique no painel admin

4. Se o dia da semana está correto:
   - Verifique se o dia atual está selecionado

5. Se já foi enviado hoje:
   - Verifique `lastSentAt` no debug

### Script retorna "Não autenticado"

**Solução:**
- Certifique-se de que o servidor está rodando (`npm run dev`)
- O script usa `local-dev-secret` automaticamente em desenvolvimento
- Se ainda der erro, verifique os logs do servidor

---

## ✅ Checklist de Teste Completo

- [ ] Servidor rodando (`npm run dev`)
- [ ] VAPID keys configuradas (`npm run verify-vapid-key`)
- [ ] Subscription registrada (`npm run debug-reminders` mostra subscriptions)
- [ ] Lembrete criado no painel admin
- [ ] Lembrete está ativo
- [ ] Horário do lembrete está correto
- [ ] Dia da semana está correto
- [ ] Script executado (`npm run check-reminders-local`)
- [ ] Notificação recebida no navegador

---

## 📊 Comandos Úteis

```bash
# Ver estado completo do sistema
npm run debug-reminders

# Verificar chave VAPID
npm run verify-vapid-key

# Testar endpoint com logs completos
npm run test-check-reminders

# Executar verificação (uma vez)
npm run check-reminders-local

# Executar verificação continuamente (a cada minuto)
npm run check-reminders-local -- --watch
```

---

## 🎯 Teste Rápido (5 minutos)

1. **Servidor rodando?** → `npm run dev`
2. **Tem subscription?** → `npm run debug-reminders`
3. **Se não tiver:** → Ative no navegador (`/chat` ou `/`)
4. **Crie lembrete:** → Admin → Novo → Horário atual + 1 minuto
5. **Execute:** → `npm run check-reminders-local -- --watch`
6. **Aguarde:** → Notificação deve chegar no horário

---

## 💡 Dicas

- **Teste local primeiro:** Sempre teste localmente antes de produção
- **Use horários próximos:** Crie lembretes para 1-2 minutos no futuro
- **Verifique logs:** Sempre olhe o console do navegador e do servidor
- **Service Worker:** Certifique-se de que está ativo no DevTools
- **Permissões:** Verifique se o navegador permite notificações

---

**Pronto!** Agora você tem um guia completo para testar as notificações. 🎉




# Guia de Configuração VAPID e Service Worker

## 🔑 Configurar Chaves VAPID

### 1. Gerar Chaves (se ainda não fez)
```bash
npm run generate-vapid-keys
```

### 2. Adicionar ao arquivo `.env.local` ou `.env`

Copie as chaves geradas e adicione ao seu arquivo de variáveis de ambiente:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKbh9VRNKi0BVSgHLK8OmNninWgtbjTpDLEM61hH5ODT2EFgDQI1Q4YIrl07u8URLGsMVDaKtD93JLU0jrwlkxY
VAPID_PRIVATE_KEY=zwUg_UWQKv6_1lFUsILxUJ7uCOnxeKcmj6r-YAR2I3U
VAPID_CONTACT_EMAIL=noreply@mediz.app
```

**⚠️ IMPORTANTE:**
- `VAPID_PRIVATE_KEY` deve ser mantida em segredo (nunca commitar no Git)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` pode ser pública (é usada no frontend)
- Reinicie o servidor após adicionar as variáveis

### 3. Verificar se as chaves estão carregadas

Após reiniciar o servidor, acesse:
```
http://localhost:3000/api/push/vapid-public-key
```

Deve retornar:
```json
{
  "publicKey": "BKbh9VRNKi0BVSgHLK8OmNninWgtbjTpDLEM61hH5ODT2EFgDQI1Q4YIrl07u8URLGsMVDaKtD93JLU0jrwlkxY"
}
```

Se retornar erro, verifique se as variáveis estão no arquivo correto e se o servidor foi reiniciado.

---

## 🔧 Verificar Service Worker no Navegador

### Chrome/Edge (DevTools)

1. **Abrir DevTools:**
   - Pressione `F12` ou `Ctrl+Shift+I` (Windows/Linux)
   - Ou `Cmd+Option+I` (Mac)

2. **Ir para a aba "Application":**
   - No menu superior do DevTools, clique em "Application"

3. **Verificar Service Workers:**
   - No menu lateral esquerdo, expanda "Service Workers"
   - Você deve ver algo como:
     ```
     Service Workers
     └── http://localhost:3000/sw.js
         Status: activated and is running
     ```

4. **Informações úteis:**
   - **Status**: Deve mostrar "activated and is running"
   - **Source**: `/sw.js`
   - **Update on reload**: Marque esta opção para atualizar automaticamente

### Firefox (DevTools)

1. **Abrir DevTools:**
   - Pressione `F12` ou `Ctrl+Shift+I`

2. **Ir para a aba "Application":**
   - No menu superior, clique em "Application"

3. **Verificar Service Workers:**
   - No menu lateral, expanda "Service Workers"
   - Verifique o status e a URL do service worker

### Safari (DevTools)

1. **Habilitar menu Desenvolvedor:**
   - Safari > Preferências > Avançado > Marcar "Mostrar menu Desenvolvedor"

2. **Abrir DevTools:**
   - Menu Desenvolvedor > Mostrar Web Inspector

3. **Verificar Service Workers:**
   - Aba "Storage" > "Service Workers"

---

## 🐛 Troubleshooting

### Service Worker não aparece

1. **Verificar se o arquivo existe:**
   - Acesse `http://localhost:3000/sw.js` diretamente
   - Deve retornar o código JavaScript do service worker

2. **Limpar cache:**
   - No DevTools > Application > Storage
   - Clique em "Clear site data"
   - Recarregue a página

3. **Verificar console:**
   - Aba "Console" do DevTools
   - Procure por erros relacionados a service worker

### Erro "VAPID keys não configuradas"

1. **Verificar arquivo `.env.local`:**
   - Certifique-se de que o arquivo existe na raiz do projeto
   - Verifique se as variáveis estão escritas corretamente (sem espaços extras)

2. **Reiniciar servidor:**
   ```bash
   # Parar o servidor (Ctrl+C)
   # Iniciar novamente
   npm run dev
   ```

3. **Verificar variáveis no servidor:**
   - Adicione um `console.log` temporário em `src/lib/webPush.ts`:
   ```typescript
   console.log('VAPID Public Key:', vapidPublicKey ? 'Configurada' : 'NÃO CONFIGURADA')
   ```

### Service Worker não registra

1. **Verificar HTTPS:**
   - Service Workers requerem HTTPS em produção
   - Em desenvolvimento, `localhost` funciona normalmente

2. **Verificar console do navegador:**
   - Procure por erros de registro do service worker

3. **Verificar se o componente está sendo renderizado:**
   - O `ServiceWorkerRegistration` deve estar no `layout.tsx`

---

## ✅ Checklist de Verificação

- [ ] Chaves VAPID geradas
- [ ] Variáveis adicionadas ao `.env.local`
- [ ] Servidor reiniciado após adicionar variáveis
- [ ] API `/api/push/vapid-public-key` retorna a chave pública
- [ ] Service Worker aparece no DevTools
- [ ] Service Worker está "activated and is running"
- [ ] Banner de notificações aparece na página
- [ ] Ao clicar em "Ativar notificações", não aparece erro de VAPID

---

## 📝 Notas Adicionais

- As chaves VAPID são únicas por aplicação
- Se você gerar novas chaves, usuários com subscriptions antigas precisarão se reinscrever
- Em produção, certifique-se de configurar as variáveis de ambiente no seu provedor de hospedagem (Vercel, etc.)







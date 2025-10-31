# 🛡️ Guia Rápido: WAF - Web Application Firewall

## 📋 Visão Geral

Este guia fornece instruções rápidas para implementar e gerenciar o WAF (Web Application Firewall) na plataforma meDIZ usando o WAF nativo da Vercel.

---

## ⚡ Início Rápido

### 1. Pré-requisitos

Certifique-se de que você tem:
- ✅ Projeto na Vercel (plano Enterprise ou Teams)
- ✅ Token de acesso da Vercel
- ✅ Variáveis de ambiente configuradas

### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env.local`:

```bash
# Vercel Configuration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_project_id_here
VERCEL_TEAM_ID=your_team_id_here  # Opcional, se necessário
```

**Como obter o token:**
1. Acesse https://vercel.com/account/tokens
2. Crie um novo token
3. Copie e adicione ao `.env.local`

**Como obter o Project ID:**
1. Acesse o projeto na Vercel Dashboard
2. Vá em Settings → General
3. Copie o "Project ID"

### 3. Instalar Dependências

```bash
npm install
```

---

## 🚀 Comandos Disponíveis

### Verificar Status do WAF

```bash
npm run waf:status
```

Este comando mostra:
- Status das regras managed (OWASP, Bot Protection, etc.)
- Status das proteções de ataque (SQLi, XSS, etc.)
- Regras customizadas ativas

### Configurar WAF (Modo Monitoramento)

```bash
# Modo monitoramento (recomendado inicialmente)
npm run waf:configure -- --mode=log

# Modo bloqueio (após validação)
npm run waf:configure -- --mode=deny

# Modo dry-run (teste sem aplicar mudanças)
npm run waf:configure -- --mode=log --dry-run
```

**Modos:**
- `log`: Apenas registra ataques (use primeiro para validar)
- `deny`: Bloqueia ataques ativamente (use após validação)

### Criar Regras Customizadas

```bash
npm run waf:rules
```

Este comando cria regras customizadas:
- Rate limiting para `/api/openai` (10 req/min)
- Proteção extra para rotas admin
- Bloqueio de user-agents suspeitos
- Proteção contra path traversal

---

## 📝 Passo a Passo de Implementação

### Fase 1: Preparação (5 minutos)

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   - Adicionar `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` ao `.env.local`

3. **Verificar se está tudo OK:**
   ```bash
   npm run waf:status
   ```

### Fase 2: Ativação em Modo Monitoramento (10 minutos)

1. **Ativar WAF em modo monitoramento:**
   ```bash
   npm run waf:configure -- --mode=log
   ```

2. **Criar regras customizadas:**
   ```bash
   npm run waf:rules
   ```

3. **Verificar status:**
   ```bash
   npm run waf:status
   ```

### Fase 3: Validação (5-7 dias)

1. **Monitorar logs:**
   - Acesse Vercel Dashboard → Security → Firewall
   - Analise eventos bloqueados
   - Identifique falsos positivos

2. **Ajustar regras se necessário:**
   - Se houver muitos falsos positivos, ajuste via Vercel Dashboard
   - Ou modifique os scripts conforme necessário

### Fase 4: Ativação Completa (10 minutos)

1. **Após validação, ativar modo bloqueio:**
   ```bash
   npm run waf:configure -- --mode=deny
   ```

2. **Verificar novamente:**
   ```bash
   npm run waf:status
   ```

---

## 🔍 O que cada script faz?

### `scripts/configure-waf.ts`
Configura as regras básicas do WAF:
- ✅ OWASP Core Rule Set
- ✅ Bot Protection
- ✅ AI Bots Protection
- ✅ SQL Injection Protection
- ✅ XSS Protection
- ✅ RFI, RCE, Session Fixation, Generic Attacks

### `scripts/create-waf-custom-rules.ts`
Cria regras customizadas específicas:
- ✅ Rate limiting para API OpenAI
- ✅ Proteção extra para rotas admin
- ✅ Bloqueio de user-agents suspeitos
- ✅ Proteção contra path traversal

### `scripts/check-waf-status.ts`
Verifica o status atual de todas as configurações do WAF.

---

## 📊 Monitoramento

### Acompanhar Logs

1. **Vercel Dashboard:**
   - Acesse: https://vercel.com/[seu-time]/[projeto]/security/firewall
   - Veja eventos em tempo real

2. **Métricas importantes:**
   - Número de ataques bloqueados
   - Tipos de ataques mais comuns
   - IPs bloqueados
   - Falsos positivos

### Alertas

Configure alertas no Vercel Dashboard para:
- Múltiplos ataques do mesmo IP
- Padrões suspeitos de tráfego
- Taxa alta de bloqueios

---

## ⚠️ Troubleshooting

### Erro: "VERCEL_TOKEN não está configurado"
**Solução:** Adicione `VERCEL_TOKEN` ao arquivo `.env.local`

### Erro: "Project not found"
**Solução:** Verifique se `VERCEL_PROJECT_ID` está correto

### Erro: "Unauthorized" ou "Forbidden"
**Solução:** 
- Verifique se o token tem permissões suficientes
- Verifique se o projeto está em um plano Enterprise/Teams

### WAF não está bloqueando ataques
**Solução:**
- Verifique se está em modo `deny` (não `log`)
- Verifique se as regras estão ativas: `npm run waf:status`
- Verifique se o projeto está em plano Enterprise/Teams

### Muitos falsos positivos
**Solução:**
- Revisar logs para identificar padrões
- Criar regras de bypass para casos específicos
- Ajustar sensibilidade das regras no Vercel Dashboard

---

## 📚 Recursos Adicionais

- **Documentação Completa:** Ver `docs/planejamento-waf.md`
- **Vercel WAF Docs:** https://vercel.com/docs/security/waf
- **Vercel Security API:** https://vercel.com/docs/rest-api/reference/security

---

## ✅ Checklist de Implementação

- [ ] Variáveis de ambiente configuradas
- [ ] Dependências instaladas (`npm install`)
- [ ] WAF ativado em modo monitoramento
- [ ] Regras customizadas criadas
- [ ] Logs monitorados por 5-7 dias
- [ ] Falsos positivos identificados e corrigidos
- [ ] WAF ativado em modo bloqueio
- [ ] Monitoramento contínuo configurado

---

**Última atualização:** Janeiro 2025  
**Versão:** 1.0


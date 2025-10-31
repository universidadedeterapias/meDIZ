# 🛡️ Planejamento: Implementação de WAF (Web Application Firewall) - meDIZ

**Data:** Janeiro 2025  
**Status:** 📋 **Em Planejamento**  
**Versão:** 1.0

---

## 📋 Sumário Executivo

Este documento apresenta uma análise completa sobre a implementação de um **Web Application Firewall (WAF)** na plataforma meDIZ, incluindo opções disponíveis, custos, benefícios e um plano de implementação detalhado.

### Conclusão Principal
✅ **RECOMENDADO:** A Vercel oferece um **WAF nativo integrado** que pode ser ativado sem custos adicionais para projetos Enterprise ou com planos específicos. Esta é a opção mais viável e recomendada.

---

## 🔍 Situação Atual

### Infraestrutura do Projeto
- **Plataforma de Hosting:** Vercel
- **Framework:** Next.js 15.2.4
- **Banco de Dados:** PostgreSQL (via Prisma)
- **Autenticação:** NextAuth v5 (JWT, Google OAuth)
- **Integrações:** Stripe, Cloudinary, OpenAI API

### Segurança Atual Implementada
✅ **Middleware de Autenticação** (`src/middleware.ts`)
- Proteção de rotas admin
- Verificação de tokens JWT
- Redirecionamento de não autorizados

✅ **NextAuth v5**
- Cookies HTTP-only
- Proteção CSRF
- JWT com expiração

✅ **Validação de Dados**
- React Hook Form + Zod
- Sanitização de inputs
- Rate limiting básico (limites diários)

❌ **O que está faltando:**
- Proteção contra ataques DDoS
- Proteção contra SQL Injection (nível de rede)
- Proteção contra XSS (nível de rede)
- Proteção contra bot attacks
- Bloqueio de IPs maliciosos
- Rate limiting avançado (por IP)
- Proteção OWASP Top 10

---

## 🎯 O que é WAF?

Um **Web Application Firewall (WAF)** é uma camada de segurança que monitora, filtra e bloqueia tráfego HTTP/HTTPS antes que alcance a aplicação. Ele protege contra:

- 🚫 **SQL Injection (SQLi)**
- 🚫 **Cross-Site Scripting (XSS)**
- 🚫 **Cross-Site Request Forgery (CSRF)**
- 🚫 **Remote File Inclusion (RFI)**
- 🚫 **Remote Code Execution (RCE)**
- 🚫 **Bot Attacks**
- 🚫 **DDoS (Distributed Denial of Service)**
- 🚫 **OWASP Top 10**

---

## 🔄 Opções de WAF Disponíveis

### 1. ✅ **Vercel WAF (Recomendado) ⭐**

#### Descrição
A Vercel oferece um **WAF nativo integrado** que funciona automaticamente na infraestrutura da plataforma, sem necessidade de configuração complexa.

#### Recursos Disponíveis
- ✅ **Managed Rulesets:**
  - **OWASP Core Rule Set (CRS)** - Proteção contra OWASP Top 10
  - **Bot Protection** - Detecção e bloqueio de bots maliciosos
  - **AI Bots** - Proteção específica contra bots de IA
  - **Bot Filter** - Filtro adicional de bots

- ✅ **Attack Protection:**
  - **SQL Injection (sqli)** - Bloqueio de tentativas SQL injection
  - **XSS** - Proteção contra Cross-Site Scripting
  - **RFI** (Remote File Inclusion)
  - **RCE** (Remote Code Execution)
  - **PHP Attacks**
  - **Java Attacks**
  - **Session Fixation (sf)**
  - **Generic Attacks (gen)**

- ✅ **Custom Rules:**
  - Criar regras personalizadas baseadas em:
    - Query parameters
    - Headers
    - User-Agent
    - Body content
    - IP addresses
    - Country/Region

- ✅ **Ações:**
  - `deny` - Bloquear requisição
  - `log` - Apenas registrar (modo monitoramento)
  - `challenge` - Desafio CAPTCHA
  - `bypass` - Ignorar (para exceções)

#### Preço
- **Hobby Plan:** ❌ Não disponível
- **Pro Plan:** ❌ Não disponível
- **Enterprise Plan:** ✅ **Incluído** (sem custo adicional)
- **Teams Plan:** ✅ **Incluído** (sem custo adicional, com algumas limitações)

#### Vantagens
- ✅ **Zero configuração adicional** - Integrado à plataforma
- ✅ **Sem custo adicional** (para planos Enterprise/Teams)
- ✅ **Performance otimizada** - Operando na edge network
- ✅ **Atualizações automáticas** - Regras atualizadas pela Vercel
- ✅ **API completa** - Configuração via SDK ou REST API
- ✅ **Logs detalhados** - Integração com Vercel Analytics

#### Desvantagens
- ❌ Disponível apenas para planos Enterprise/Teams
- ❌ Menos personalização que soluções terceirizadas
- ❌ Dependência total da Vercel

#### Como Ativar
```typescript
// Via Vercel SDK
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN,
});

// Ativar OWASP Rules
await vercel.security.updateFirewallConfig({
  projectId: "your-project-id",
  teamId: "your-team-id",
  requestBody: {
    action: "managedRules.update",
    id: "owasp",
    value: {
      active: true,
      action: "deny" // ou "log" para modo monitoramento
    }
  }
});
```

---

### 2. 🌐 **Cloudflare WAF**

#### Descrição
Solução WAF externa oferecida pela Cloudflare, líder em segurança e performance web.

#### Recursos
- ✅ Proteção DDoS avançada
- ✅ WAF com regras customizáveis
- ✅ Rate limiting
- ✅ Bot management
- ✅ Proteção OWASP

#### Preço
- **Free Plan:** WAF básico (limitado)
- **Pro Plan:** $20/mês - WAF completo
- **Business Plan:** $200/mês - WAF avançado + Bot Management
- **Enterprise:** Preço customizado

#### Vantagens
- ✅ Independente da plataforma de hosting
- ✅ CDN global incluído
- ✅ Bot management avançado
- ✅ Analytics detalhados

#### Desvantagens
- ❌ Custo adicional mensal
- ❌ Necessita configuração de DNS (Cloudflare como proxy)
- ❌ Pode adicionar latência (se mal configurado)

#### Como Integrar
1. Migrar DNS para Cloudflare
2. Configurar proxy reverso
3. Ativar WAF no painel Cloudflare
4. Configurar regras customizadas

---

### 3. ☁️ **AWS WAF**

#### Descrição
WAF da Amazon Web Services, ideal se a aplicação estiver hospedada na AWS.

#### Recursos
- ✅ Proteção completa OWASP
- ✅ Rate limiting
- ✅ Geolocation blocking
- ✅ Integration com CloudFront/ALB

#### Preço
- **Base:** $5/mês por web ACL
- **Requests:** $1.00 por 1 milhão de requisições

#### Vantagens
- ✅ Altamente customizável
- ✅ Integration com outros serviços AWS
- ✅ Escalável

#### Desvantagens
- ❌ Não aplicável (aplicação não está na AWS)
- ❌ Complexidade de configuração
- ❌ Custos adicionais significativos

---

### 4. 🛠️ **Solução Self-Hosted (ModSecurity + Nginx)**

#### Descrição
Implementação própria usando ModSecurity com Nginx como reverse proxy.

#### Recursos
- ✅ Controle total
- ✅ Customização completa
- ✅ Sem dependências externas

#### Preço
- Servidor dedicado: $20-100/mês
- Manutenção e configuração: Tempo de desenvolvedor

#### Vantagens
- ✅ Controle total
- ✅ Sem custos recorrentes adicionais

#### Desvantagens
- ❌ Complexidade alta
- ❌ Necessita manutenção constante
- ❌ Não escalável facilmente
- ❌ Responsabilidade de segurança recai sobre o time

---

## 📊 Análise Comparativa

| Característica | Vercel WAF | Cloudflare | AWS WAF | Self-Hosted |
|----------------|------------|------------|---------|-------------|
| **Custo (Enterprise)** | ✅ Grátis | 💰 $200/mês | 💰 $5+req | 💰 $50+/mês |
| **Facilidade Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Customização** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Integração** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Suporte** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Recomendado?** | ✅ **SIM** | ✅ Sim | ❌ Não | ❌ Não |

---

## 💡 Recomendação Final

### **Opção 1: Vercel WAF (Recomendada) ⭐**

**Para quem:**
- Projeto já está na Vercel
- Plano Enterprise ou Teams
- Quer solução integrada sem complexidade

**Próximos passos:**
1. ✅ Verificar se o projeto está em plano Enterprise/Teams
2. ✅ Ativar WAF via Vercel Dashboard ou API
3. ✅ Configurar regras básicas (OWASP, Bot Protection)
4. ✅ Testar em modo `log` primeiro
5. ✅ Ativar modo `deny` após validação

---

### **Opção 2: Cloudflare WAF (Alternativa)**

**Para quem:**
- Não tem acesso a Vercel Enterprise
- Precisa de proteção imediata
- Pode migrar DNS para Cloudflare

**Próximos passos:**
1. ✅ Migrar DNS para Cloudflare
2. ✅ Configurar proxy reverso
3. ✅ Ativar WAF no plano Pro/Business
4. ✅ Configurar regras customizadas

---

## 📝 Plano de Implementação - Vercel WAF

### Fase 1: Preparação (1 dia)

#### 1.1 Verificar Plano Vercel
- [ ] Confirmar se projeto está em plano Enterprise ou Teams
- [ ] Se não, avaliar upgrade ou migração para Cloudflare

#### 1.2 Documentar Endpoints Críticos
- [ ] Listar todas as rotas API
- [ ] Identificar rotas públicas vs. privadas
- [ ] Mapear padrões de tráfego normal

#### 1.3 Configurar Variáveis de Ambiente
```bash
# Adicionar ao .env
VERCEL_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id
```

### Fase 2: Configuração Inicial (2-3 dias)

#### 2.1 Ativar Regras Managed (Modo Monitoramento)
- [ ] OWASP Core Rule Set - `log`
- [ ] Bot Protection - `log`
- [ ] AI Bots Protection - `log`

#### 2.2 Ativar Attack Protection (Modo Monitoramento)
- [ ] SQL Injection - `log`
- [ ] XSS - `log`
- [ ] RFI - `log`
- [ ] RCE - `log`
- [ ] Session Fixation - `log`

#### 2.3 Criar Script de Configuração
```typescript
// scripts/configure-waf.ts
// Script para configurar WAF via Vercel SDK
```

### Fase 3: Testes e Validação (3-5 dias)

#### 3.1 Monitorar Logs
- [ ] Analisar logs de segurança no Vercel Dashboard
- [ ] Identificar falsos positivos
- [ ] Validar detecções de ataques reais

#### 3.2 Testar Cenários
- [ ] Testar ataques SQL injection (esperado: bloqueado)
- [ ] Testar XSS attempts (esperado: bloqueado)
- [ ] Testar tráfego legítimo (esperado: permitido)
- [ ] Testar bots maliciosos (esperado: bloqueado)

#### 3.3 Ajustar Regras
- [ ] Criar regras de bypass para casos específicos
- [ ] Ajustar sensibilidade das regras
- [ ] Documentar exceções

### Fase 4: Ativação Completa (1 dia)

#### 4.1 Mudar para Modo Bloqueio
- [ ] Alterar todas as regras de `log` para `deny`
- [ ] Manter apenas exceções em `bypass`

#### 4.2 Monitoramento Contínuo
- [ ] Configurar alertas no Vercel
- [ ] Criar dashboard de segurança
- [ ] Documentar procedimentos de resposta

### Fase 5: Regras Customizadas (Opcional, contínuo)

#### 5.1 Proteções Específicas
- [ ] Rate limiting por IP nas rotas `/api/openai`
- [ ] Bloqueio de países específicos (se necessário)
- [ ] Whitelist de IPs conhecidos (admin)
- [ ] Proteção adicional para `/api/admin`

---

## 🛠️ Scripts de Implementação

### Script 1: Configuração Inicial WAF

```typescript
// scripts/configure-waf.ts
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN!,
});

async function configureWAF() {
  const projectId = process.env.VERCEL_PROJECT_ID!;
  const teamId = process.env.VERCEL_TEAM_ID;

  // 1. Ativar OWASP Rules (modo monitoramento)
  await vercel.security.updateFirewallConfig({
    projectId,
    teamId,
    requestBody: {
      action: "managedRules.update",
      id: "owasp",
      value: {
        active: true,
        action: "log" // Mudar para "deny" após validação
      }
    }
  });

  // 2. Ativar Bot Protection
  await vercel.security.updateFirewallConfig({
    projectId,
    teamId,
    requestBody: {
      action: "managedRules.update",
      id: "bot_protection",
      value: {
        active: true,
        action: "log"
      }
    }
  });

  // 3. Ativar SQL Injection Protection
  await vercel.security.updateFirewallConfig({
    projectId,
    teamId,
    requestBody: {
      action: "attack_settings",
      value: {
        sqli: {
          active: true,
          action: "log"
        },
        xss: {
          active: true,
          action: "log"
        },
        rfi: {
          active: true,
          action: "log"
        },
        rce: {
          active: true,
          action: "log"
        }
      }
    }
  });

  console.log("✅ WAF configurado em modo monitoramento");
}

configureWAF().catch(console.error);
```

### Script 2: Criar Regra Customizada (Rate Limiting)

```typescript
// scripts/create-rate-limit-rule.ts
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: process.env.VERCEL_TOKEN!,
});

async function createRateLimitRule() {
  await vercel.security.updateFirewallConfig({
    projectId: process.env.VERCEL_PROJECT_ID!,
    teamId: process.env.VERCEL_TEAM_ID,
    requestBody: {
      action: "rules.insert",
      id: null,
      value: {
        active: true,
        name: "Rate Limit OpenAI API",
        description: "Limitar requisições para /api/openai por IP",
        conditionGroup: [
          {
            conditions: [
              {
                type: "uri",
                op: "eq",
                value: "/api/openai"
              }
            ]
          }
        ],
        action: {
          mitigate: {
            action: "challenge", // CAPTCHA após limite
            rateLimit: {
              requests: 10,
              window: 60 // 10 requisições por minuto
            }
          }
        }
      }
    }
  });

  console.log("✅ Regra de rate limiting criada");
}

createRateLimitRule().catch(console.error);
```

---

## 📊 Métricas e Monitoramento

### KPIs a Acompanhar
- 📈 **Número de ataques bloqueados por dia**
- 📈 **Taxa de falsos positivos**
- 📈 **Latência adicionada pelo WAF**
- 📈 **Tipos de ataques mais comuns**
- 📈 **IPs bloqueados**

### Dashboard Recomendado
Criar dashboard no painel admin mostrando:
- Gráfico de ataques bloqueados
- Top 10 países de origem de ataques
- Top 10 tipos de ataques
- Timeline de eventos de segurança

---

## ⚠️ Considerações Importantes

### Performance
- ✅ WAF da Vercel opera na **edge network**, adicionando latência mínima (<10ms)
- ✅ Regras customizadas complexas podem impactar performance
- ⚠️ Testar sempre em produção após implementação

### Falsos Positivos
- ⚠️ Algumas regras podem bloquear tráfego legítimo
- ✅ Sempre começar em modo `log` para identificar problemas
- ✅ Manter lista de IPs/User-Agents para bypass

### Manutenção
- ✅ Revisar logs mensalmente
- ✅ Atualizar regras conforme necessário
- ✅ Documentar todas as exceções

### Backup Plan
Se o WAF da Vercel não estiver disponível:
1. Migrar para Cloudflare WAF (plano Pro: $20/mês)
2. Implementar rate limiting no middleware Next.js
3. Usar serviços como Upstash Redis para rate limiting distribuído

---

## 🎯 Próximos Passos Imediatos

### ✅ Ação Imediata (Esta Semana)
1. [ ] Verificar plano Vercel atual
2. [ ] Avaliar custo de upgrade para Enterprise (se necessário)
3. [ ] Criar script de configuração WAF
4. [ ] Documentar endpoints críticos

### 📅 Curto Prazo (Próximas 2 Semanas)
1. [ ] Ativar WAF em modo monitoramento
2. [ ] Analisar logs por 5-7 dias
3. [ ] Ajustar regras conforme necessário
4. [ ] Criar dashboard de monitoramento

### 🚀 Médio Prazo (Próximo Mês)
1. [ ] Ativar modo bloqueio completo
2. [ ] Implementar regras customizadas
3. [ ] Integrar alertas com sistema de notificações
4. [ ] Documentar procedimentos de resposta a incidentes

---

## 📚 Referências

- **Vercel WAF Documentation:** https://vercel.com/docs/security/waf
- **Vercel Security API:** https://vercel.com/docs/rest-api/reference/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Cloudflare WAF:** https://www.cloudflare.com/waf/

---

## 📝 Changelog

- **2025-01-XX:** Documento criado - Análise inicial de opções WAF
- **2025-01-XX:** Adicionada seção de scripts de implementação
- **2025-01-XX:** Adicionado plano de implementação detalhado

---

**Documento criado por:** AI Assistant (modo planejador)  
**Última atualização:** Janeiro 2025  
**Status:** ✅ Pronto para implementação


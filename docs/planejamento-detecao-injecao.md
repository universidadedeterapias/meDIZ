# 🛡️ Planejamento: Detecção de SQL/Command Injection - meDIZ

**Data:** Janeiro 2025  
**Status:** 📋 **Em Planejamento**  
**Versão:** 1.0

---

## 📋 Sumário Executivo

Este documento apresenta o planejamento completo para implementar um sistema de detecção automática de tentativas de **SQL Injection** e **Command Injection** na plataforma meDIZ, com alertas automáticos enviados aos administradores via WhatsApp e registros no painel admin.

### Objetivo Principal
✅ **Detectar em tempo real** tentativas de injeção de comandos (SQL, Command) em requisições HTTP e **alertar automaticamente** os administradores quando dados maliciosos são enviados ao servidor.

---

## 🎯 O que são SQL Injection e Command Injection?

### SQL Injection (SQLi)
- **Definição:** Tentativa de injetar código SQL malicioso através de entrada de dados do usuário
- **Exemplo:** `' OR '1'='1` ou `'; DROP TABLE users; --`
- **Impacto:** Acesso não autorizado ao banco de dados, roubo de dados, exclusão de dados

### Command Injection
- **Definição:** Tentativa de executar comandos do sistema operacional através de entrada do usuário
- **Exemplo:** `; rm -rf /` ou `| cat /etc/passwd`
- **Impacto:** Execução de comandos arbitrários no servidor, acesso ao sistema de arquivos

---

## 🔍 Situação Atual

### Proteções Existentes
✅ **Prisma ORM** - Usa prepared statements (proteção automática contra SQLi)
✅ **Validação de Dados** - React Hook Form + Zod
✅ **Sanitização** - Dados sanitizados antes de salvar

### Vulnerabilidades Potenciais
⚠️ **Inputs não validados** podem chegar até queries do Prisma
⚠️ **APIs que recebem dados do usuário** podem ser alvo
⚠️ **Sem detecção proativa** de tentativas de ataque
⚠️ **Sem alertas automáticos** quando tentativas são detectadas

### Oportunidades
✅ Sistema de alertas já existe (`/api/admin/security-alerts`)
✅ WhatsApp já configurado para envio de alertas
✅ Painel admin já tem página de alertas (`/admin/security-alerts`)
✅ Sistema de audit logs já implementado

---

## 🏗️ Arquitetura Proposta

### 1. **Camada de Detecção**
```
Requisição HTTP
    ↓
Middleware Next.js (detecção)
    ↓
Biblioteca de Detecção (sql-injection-detector.ts)
    ↓
Análise de padrões maliciosos
    ↓
Retorno: { detected: true, type: 'SQL_INJECTION', patterns: [...] }
```

### 2. **Camada de Resposta**
```
Detecção Positiva
    ↓
Bloquear requisição (403 Forbidden)
    ↓
Registrar no audit log
    ↓
Disparar alerta automático via WhatsApp
    ↓
Registrar no banco de dados
```

### 3. **Camada de Visualização**
```
Painel Admin
    ↓
Página de Alertas de Injeção
    ↓
Lista de tentativas detectadas
    ↓
Filtros e estatísticas
```

---

## 📊 Padrões de Detecção

### SQL Injection Patterns

```typescript
const SQL_INJECTION_PATTERNS = [
  // Comment injection
  /(--|\#|\/\*|\*\/)/i,
  // Union-based
  /union[\s]+select/i,
  // Boolean-based
  /('|"|;|`)[\s]*(or|and)[\s]+[\d\w]+[\s]*=[\s]*[\d\w]+/i,
  /('|"|;|`)[\s]*(or|and)[\s]+[\d\w]+[\s]*like[\s]+[\d\w]+/i,
  // Time-based
  /(sleep|waitfor|delay)[\s]*\(/i,
  // Function-based
  /(version|database|user|concat|cast|convert|exec|execute|sp_executesql)\(/i,
  // Stacked queries
  /;[\s]*(drop|delete|truncate|update|insert|alter|create)/i,
  // Error-based
  /(extractvalue|updatexml|exp|floor|rand)\(/i,
]
```

### Command Injection Patterns

```typescript
const COMMAND_INJECTION_PATTERNS = [
  // Command chaining
  /[;&|`$(){}[\]]+/,
  // System commands
  /(rm|del|mv|cp|cat|ls|dir|ps|kill|chmod|chown|sudo|su|sh|bash|cmd|powershell)/i,
  // Path traversal
  /\.\.(\/|\\)/,
  // Redirection
  /[<>][\s]*[\w\.\/]+/,
  // Environment variables
  /\$\{?[\w]+\}?/,
  // Windows commands
  /(ipconfig|netstat|tasklist|systeminfo)/i,
]
```

---

## 🔧 Implementação Técnica

### Fase 1: Biblioteca de Detecção

**Arquivo:** `src/lib/security/injection-detector.ts`

**Responsabilidades:**
- Detectar padrões de SQL Injection
- Detectar padrões de Command Injection
- Retornar detalhes sobre a detecção (tipo, padrão encontrado, localização)

**Interface:**
```typescript
interface InjectionDetectionResult {
  detected: boolean
  type?: 'SQL_INJECTION' | 'COMMAND_INJECTION'
  pattern?: string
  location?: 'query' | 'body' | 'headers'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: {
    field?: string
    value?: string
    matchedPattern?: string
  }
}
```

### Fase 2: Integração no Middleware

**Arquivo:** `src/middleware.ts` (modificar)

**Funcionalidades:**
- Executar detecção em todas as requisições API (`/api/*`)
- Analisar query parameters, body, headers
- Bloquear requisições maliciosas (403)
- Disparar alertas automáticos

### Fase 3: Sistema de Alertas Automáticos

**Arquivo:** `src/lib/security/alert-service.ts`

**Responsabilidades:**
- Receber detecções do middleware
- Enviar alertas via WhatsApp usando sistema existente
- Registrar no audit log
- Salvar no banco de dados (nova tabela `injection_attempts`)

### Fase 4: API de Visualização

**Arquivo:** `src/app/api/admin/injection-attempts/route.ts`

**Responsabilidades:**
- Listar tentativas de injeção
- Filtros (tipo, data, IP)
- Estatísticas
- Exportação de dados

### Fase 5: Interface no Painel Admin

**Arquivo:** `src/app/admin/injection-attempts/page.tsx`

**Funcionalidades:**
- Lista de tentativas detectadas
- Filtros avançados
- Gráficos e estatísticas
- Detalhes de cada tentativa
- Ações (bloquear IP, etc.)

---

## 📝 Schema do Banco de Dados

### Tabela: `injection_attempts`

```prisma
model InjectionAttempt {
  id            String   @id @default(uuid())
  type          String   // 'SQL_INJECTION' | 'COMMAND_INJECTION'
  severity      String   // 'low' | 'medium' | 'high' | 'critical'
  pattern       String   // Padrão detectado
  location      String   // 'query' | 'body' | 'headers'
  field         String?  // Campo onde foi detectado (opcional)
  value         String?  // Valor suspeito (sanitizado)
  endpoint      String   // Endpoint atacado
  method        String   // HTTP method
  ipAddress     String   // IP do atacante
  userAgent     String?  // User agent
  userId        String?  // ID do usuário (se autenticado)
  blocked       Boolean  @default(true) // Se foi bloqueado
  alertSent     Boolean  @default(false) // Se alerta foi enviado
  createdAt     DateTime @default(now())
  
  @@index([type])
  @@index([ipAddress])
  @@index([createdAt])
  @@index([blocked])
}
```

---

## 🔄 Fluxo de Detecção

### Fluxo Completo

```
1. Requisição HTTP chega ao servidor
   ↓
2. Middleware intercepta (todas as /api/*)
   ↓
3. Extrai dados: query params, body, headers
   ↓
4. Executa detecção usando injection-detector
   ↓
5. Se detectado:
   a. Bloqueia requisição (403)
   b. Registra no banco (injection_attempts)
   c. Registra no audit log
   d. Dispara alerta via WhatsApp
   ↓
6. Se não detectado:
   → Continua processamento normal
```

### Exemplo de Requisição Maliciosa

```
POST /api/user/form
Body: {
  "fullName": "'; DROP TABLE users; --",
  "age": 30
}
```

**Detecção:**
- ✅ Detecta padrão SQL: `'; DROP TABLE users; --`
- ✅ Tipo: `SQL_INJECTION`
- ✅ Severidade: `critical`
- ✅ Bloqueia requisição
- ✅ Envia alerta aos admins

---

## 🚨 Sistema de Alertas

### Tipos de Alerta

1. **SQL_INJECTION_DETECTED**
   - Quando padrão SQL é detectado
   - Severidade: Alta/Crítica
   - Enviar imediatamente

2. **COMMAND_INJECTION_DETECTED**
   - Quando padrão de comando é detectado
   - Severidade: Crítica
   - Enviar imediatamente

### Formato do Alerta WhatsApp

```
🚨 ALERTA DE SEGURANÇA - meDIZ

Tipo: SQL Injection Detectado
Severidade: CRÍTICA

Detalhes:
• Endpoint: /api/user/form
• IP: 192.168.1.100
• Padrão: '; DROP TABLE users; --
• Campo: fullName
• Bloqueado: Sim

Data: 2025-01-XX 14:30:00
```

---

## 📊 Métricas e Monitoramento

### KPIs a Acompanhar
- 📈 **Número de tentativas por dia**
- 📈 **Tipos de injeção mais comuns**
- 📈 **IPs mais ativos**
- 📈 **Endpoints mais atacados**
- 📈 **Taxa de bloqueio**

### Dashboard Recomendado
- Gráfico de tentativas ao longo do tempo
- Top 10 IPs maliciosos
- Top 10 endpoints atacados
- Distribuição por tipo (SQL vs Command)
- Distribuição por severidade

---

## ⚠️ Considerações Importantes

### Performance
- ✅ Detecção é rápida (regex matching)
- ✅ Executada apenas em rotas `/api/*`
- ⚠️ Evitar falsos positivos com padrões muito agressivos

### Falsos Positivos
- ⚠️ Alguns padrões podem detectar dados legítimos
- ✅ Permitir whitelist de padrões conhecidos
- ✅ Permitir desabilitar detecção para endpoints específicos

### Privacidade
- ✅ Não armazenar dados sensíveis completos
- ✅ Sanitizar valores antes de salvar
- ✅ Limitar tempo de retenção (30 dias)

### Escalabilidade
- ✅ Índices no banco para queries rápidas
- ✅ Limitar número de tentativas por IP (rate limiting)
- ✅ Cache de IPs bloqueados

---

## 🔒 Segurança Adicional

### Bloqueio de IP
- Após X tentativas do mesmo IP, bloquear temporariamente
- Lista de IPs bloqueados
- Desbloqueio manual ou automático após 24h

### Rate Limiting
- Limitar requisições por IP em um período
- Prevenir ataques de força bruta

### Logging Detalhado
- Registrar todas as tentativas
- Manter histórico para análise forense
- Exportação de logs para análise externa

---

## 📅 Cronograma de Implementação

### Fase 1: Biblioteca de Detecção (2-3 dias)
- [ ] Criar `injection-detector.ts`
- [ ] Implementar padrões SQL Injection
- [ ] Implementar padrões Command Injection
- [ ] Testes unitários

### Fase 2: Integração no Middleware (2 dias)
- [ ] Modificar `middleware.ts`
- [ ] Adicionar detecção em todas as rotas `/api/*`
- [ ] Implementar bloqueio de requisições
- [ ] Testes de integração

### Fase 3: Sistema de Alertas (2 dias)
- [ ] Criar `alert-service.ts`
- [ ] Integrar com sistema WhatsApp existente
- [ ] Criar schema Prisma para `injection_attempts`
- [ ] Migration do banco de dados

### Fase 4: API de Visualização (1-2 dias)
- [ ] Criar `/api/admin/injection-attempts`
- [ ] Implementar filtros e paginação
- [ ] Estatísticas e agregações

### Fase 5: Interface Admin (2-3 dias)
- [ ] Criar página `/admin/injection-attempts`
- [ ] Tabela de tentativas
- [ ] Filtros e busca
- [ ] Gráficos e estatísticas

### Fase 6: Testes e Validação (2 dias)
- [ ] Testes com payloads reais
- [ ] Validação de falsos positivos
- [ ] Ajustes de padrões
- [ ] Documentação

**Total Estimado:** 11-14 dias

---

## 🎯 Próximos Passos Imediatos

1. ✅ Criar biblioteca de detecção
2. ✅ Criar schema Prisma
3. ✅ Modificar middleware
4. ✅ Criar serviço de alertas
5. ✅ Testar com payloads reais

---

## 📚 Referências

- **OWASP SQL Injection:** https://owasp.org/www-community/attacks/SQL_Injection
- **OWASP Command Injection:** https://owasp.org/www-community/attacks/Command_Injection
- **Prisma Security:** https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
- **Next.js Middleware:** https://nextjs.org/docs/app/building-your-application/routing/middleware

---

**Documento criado por:** AI Assistant (modo planejador)  
**Última atualização:** Janeiro 2025  
**Status:** ✅ Pronto para implementação


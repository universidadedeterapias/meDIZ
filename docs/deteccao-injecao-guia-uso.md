# 🛡️ Guia de Uso: Detecção de Injeção de Comandos

## 📋 Visão Geral

Sistema automático de detecção de **SQL Injection** e **Command Injection** que:
- ✅ Detecta padrões maliciosos em requisições HTTP
- ✅ Bloqueia requisições automaticamente (403)
- ✅ Envia alertas via WhatsApp para admins
- ✅ Registra todas as tentativas no banco de dados
- ✅ Exibe no painel admin em tempo real

---

## 🔧 Como Funciona

### Detecção Automática

O sistema detecta automaticamente em:
- ✅ **Query Parameters** (via middleware)
- ✅ **Headers HTTP** (via middleware)
- ⚠️ **Body JSON** (via helper nas rotas API)

### O que é Detectado

#### SQL Injection
- Padrões como: `' OR '1'='1`, `'; DROP TABLE users; --`
- Union attacks, boolean-based, time-based
- Funções perigosas: `exec()`, `sp_executesql()`, etc.

#### Command Injection
- Padrões como: `; rm -rf /`, `| cat /etc/passwd`
- Comandos do sistema: `rm`, `cat`, `ls`, `sudo`, etc.
- Redirecionamento: `>`, `<`, `|`

---

## 📝 Implementação em Rotas API

### Opção 1: Usar Helper (Recomendado)

Para rotas que recebem JSON no body, use o helper após parsear:

```typescript
// src/app/api/user/form/route.ts
import { analyzeRouteData } from '@/lib/security/injection-route-helper'
import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // 1. Autenticar primeiro
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  // 2. Parsear body
  const body = await req.json()
  
  // 3. Analisar antes de processar
  const detection = await analyzeRouteData(
    req,
    '/api/user/form',
    body,
    session.user.id
  )
  
  // 4. Se detectado, retorna 403 automaticamente
  if (detection) {
    return detection // Já contém resposta 403
  }
  
  // 5. Continuar processamento normal
  // ... seu código aqui ...
  
  return NextResponse.json({ success: true })
}
```

### Opção 2: Detecção Manual

Se precisar de mais controle:

```typescript
import { detectInjection } from '@/lib/security/injection-detector'
import { processInjectionDetection } from '@/lib/security/injection-alert-service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  // Detectar
  const detections = detectInjection({
    query: Object.fromEntries(req.nextUrl.searchParams),
    body,
    headers: Object.fromEntries(req.headers)
  })
  
  if (detections.length > 0) {
    // Processar alerta
    await processInjectionDetection(
      detections[0],
      req,
      '/api/custom-endpoint',
      session?.user?.id
    )
    
    // Bloquear
    return NextResponse.json(
      { error: 'Requisição bloqueada' },
      { status: 403 }
    )
  }
  
  // Continuar...
}
```

---

## 🔍 Rotas que Já São Protegidas

### Via Middleware (automático)
- ✅ Todas as rotas `/api/*`
- ✅ Query parameters analisados
- ✅ Headers analisados

### Rotas que Precisam do Helper
Adicione o helper nas rotas que recebem body JSON:
- `/api/user/form` ✅ (exemplo acima)
- `/api/admin/*` ✅ (já protegidas por autenticação)
- `/api/openai` ⚠️ (pode precisar)

---

## 📊 Visualização no Painel Admin

### Acessar
1. Faça login como admin
2. Navegue para **"Tentativas de Injeção"** no menu lateral
3. Ou acesse: `/admin/injection-attempts`

### Funcionalidades
- ✅ **Lista de tentativas** com filtros
- ✅ **Estatísticas** em tempo real
- ✅ **Filtros** por tipo, severidade, IP
- ✅ **Auto-refresh** a cada 30 segundos
- ✅ **Detalhes** de cada tentativa

### Estatísticas Exibidas
- Total de tentativas
- SQL Injection vs Command Injection
- Severidade crítica
- Últimas 24 horas

---

## 🚨 Alertas Automáticos

### Quando são Enviados
- ✅ Sempre que uma injeção é detectada
- ✅ Via WhatsApp para todos os admins
- ✅ Registrado no audit log

### Formato do Alerta

```
🚨 ALERTA DE SEGURANÇA - meDIZ

Tipo: SQL Injection Detectado
Severidade: CRÍTICA 🚨

Detalhes:
• Endpoint: POST /api/user/form
• IP: 192.168.1.100
• Padrão: Stacked Query
• Campo: fullName
• Bloqueado: Sim

Data: 01/01/2025 14:30:00
```

---

## 🔒 Próximos Passos

### 1. Executar Migration
```bash
npx prisma migrate dev --name add_injection_attempts
```

### 2. Adicionar Helper nas Rotas Críticas
Adicione `analyzeRouteData` nas rotas que recebem dados do usuário:
- `/api/user/form`
- `/api/openai` (se receber input direto)
- Outras rotas que processam input do usuário

### 3. Testar
```bash
# Teste com payload SQL Injection
curl -X POST http://localhost:3000/api/user/form \
  -H "Content-Type: application/json" \
  -d '{"fullName": "'; DROP TABLE users; --"}'
  
# Esperado: 403 Forbidden + Alerta enviado
```

### 4. Monitorar
- Acesse `/admin/injection-attempts`
- Verifique alertas no WhatsApp
- Analise padrões de ataques

---

## ⚠️ Considerações

### Performance
- ✅ Detecção é rápida (regex matching)
- ✅ Não impacta performance significativamente
- ✅ Executado apenas em rotas API

### Falsos Positivos
- ⚠️ Alguns padrões podem ser muito agressivos
- ✅ Whitelist de padrões seguros implementada
- ✅ Valores normais (texto simples, números) são ignorados

### Privacidade
- ✅ Valores suspeitos são limitados a 500 caracteres
- ✅ Apenas admins têm acesso aos dados
- ✅ Retenção de dados por 30 dias (configurável)

---

## 📚 Referências

- **Documentação Completa:** `docs/planejamento-detecao-injecao.md`
- **Biblioteca de Detecção:** `src/lib/security/injection-detector.ts`
- **Serviço de Alertas:** `src/lib/security/injection-alert-service.ts`
- **Helper para Rotas:** `src/lib/security/injection-route-helper.ts`

---

**Última atualização:** Janeiro 2025  
**Versão:** 1.0


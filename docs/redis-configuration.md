# Configuração Redis - ExemploApp

## 📋 Visão Geral

O Redis é usado para:
- **Rate Limiting**: Limitação de requisições por email (10/min)
- **Bloqueio de IPs**: Bloqueio automático após múltiplas tentativas de login

## 🔧 Configuração

### Variável de Ambiente

Adicione a seguinte variável ao seu `.env.local` ou variáveis de ambiente do Vercel:

```env
REDIS_URL="redis://usuario:senha@host:porta"
```

### Exemplos de REDIS_URL

**Redis Local:**
```env
REDIS_URL="redis://localhost:6379"
```

**Redis com Senha:**
```env
REDIS_URL="redis://:senha@localhost:6379"
```

**Redis na Nuvem (Upstash, Redis Cloud, etc):**
```env
REDIS_URL="rediss://default:senha@host.upstash.io:6379"
```

**Redis no Vercel (Upstash):**
1. Crie uma instância Upstash no Vercel Dashboard
2. Use a URL fornecida automaticamente

## 🚀 Provedores Recomendados

### 1. **Upstash** (Recomendado para Vercel)
- **Gratuito**: 10K comandos/dia
- **Integração**: Nativa com Vercel
- **Setup**: Automático via Vercel Dashboard

**Como configurar:**
1. Acesse Vercel Dashboard → Storage → Create → Upstash Redis
2. A variável `REDIS_URL` é criada automaticamente
3. Pronto! ✅

### 2. **Redis Cloud**
- **Gratuito**: 30MB
- **Setup**: Manual
- **URL**: Fornecida no dashboard

### 3. **Redis Local** (Desenvolvimento)
```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# Ou instalação local
redis-server
```

## ⚙️ Fallback Automático

Se `REDIS_URL` não estiver configurada:
- **Desenvolvimento**: Usa store em memória (com aviso)
- **Produção**: Erro (Redis é obrigatório)

## 📊 Como Funciona

### Rate Limiting
- Chave: `rate_limit:{email}`
- TTL: 60 segundos
- Valor: Contador de requisições

### Bloqueio de IP
- Chave de bloqueio: `ip_block:{ip}`
- Chave de tentativas: `ip_attempts:{ip}`
- TTL: 15 minutos (900 segundos)
- Bloqueia após 5 tentativas

## 🔍 Verificação

Para verificar se Redis está funcionando:

```typescript
import { isRedisAvailable } from '@/lib/redis'

const available = await isRedisAvailable()
console.log('Redis disponível:', available)
```

## 🐛 Troubleshooting

### Erro: "REDIS_URL não configurada"
**Solução**: Configure a variável `REDIS_URL` no `.env.local` ou Vercel

### Erro: "Connection refused"
**Solução**: Verifique se o Redis está rodando e a URL está correta

### Erro: "ECONNREFUSED"
**Solução**: 
1. Verifique se o Redis está acessível
2. Verifique firewall/portas
3. Para produção, use Redis na nuvem (Upstash)

### Performance Lenta
**Solução**:
- Use Redis na mesma região do servidor
- Configure connection pooling se necessário
- Monitore comandos Redis

## 📝 Notas Importantes

1. **Em produção, Redis é obrigatório** para funcionamento correto em ambiente serverless
2. **Desenvolvimento local**: Funciona sem Redis (usa memória), mas recomendado ter Redis
3. **TTL automático**: Redis gerencia expiração automaticamente, não precisa cleanup manual
4. **Thread-safe**: Redis é thread-safe, funciona em múltiplas instâncias serverless

## 🔗 Links Úteis

- [Upstash Redis](https://upstash.com/)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Redis Commands](https://redis.io/commands/)


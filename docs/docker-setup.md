# 🐳 Guia de Setup Docker - meDIZ

Este guia explica como configurar e usar Docker para desenvolvimento local do meDIZ.

---

## 📋 Pré-requisitos

- **Docker** instalado (versão 20.10 ou superior)
- **Docker Compose** instalado (versão 2.0 ou superior)

### Verificar Instalação

```bash
docker --version
docker compose version
```

---

## 🚀 Início Rápido

### 1. Desenvolvimento Local (Recomendado)

Para desenvolvimento com hot-reload:

```bash
# Iniciar serviços (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d postgres redis

# Aguardar serviços ficarem prontos (10-20 segundos)
# Verificar status
docker compose -f docker-compose.dev.yml ps

# Executar migrations
npx prisma migrate dev

# Iniciar aplicação localmente (fora do Docker para hot-reload)
npm run dev
```

**Vantagens:**
- Hot-reload funciona normalmente
- Desenvolvimento mais rápido
- Fácil debug
- Apenas banco e Redis no Docker

### 2. Desenvolvimento Completo no Docker

Para rodar tudo no Docker (incluindo a aplicação):

```bash
# Build e iniciar todos os serviços
docker compose -f docker-compose.dev.yml up --build

# Em outro terminal, executar migrations
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev
```

**Acesso:**
- Aplicação: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 🏗️ Produção (Docker)

### Build e Deploy

```bash
# Build da imagem
docker compose build

# Iniciar serviços
docker compose up -d

# Executar migrations
docker compose exec app npx prisma migrate deploy
```

---

## 📁 Estrutura de Arquivos Docker

```
meDIZ/
├── Dockerfile              # Build de produção
├── Dockerfile.dev          # Build de desenvolvimento
├── docker-compose.yml      # Compose de produção
├── docker-compose.dev.yml  # Compose de desenvolvimento
└── .dockerignore          # Arquivos ignorados no build
```

---

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Database (usando Docker)
DATABASE_URL=postgresql://mediz:mediz_password@localhost:5432/mediz_db?schema=public

# Redis (usando Docker)
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=seu-secret-aqui

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret

# Cloudinary (opcional)
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=seu-api-key
CLOUDINARY_API_SECRET=seu-api-secret

# Stripe (opcional)
STRIPE_SECRET_KEY=seu-secret-key
STRIPE_PUBLISHABLE_KEY=seu-publishable-key

# n8n Webhook (opcional)
N8N_CHAT_WEBHOOK_URL=https://seu-webhook-url
```

**Nota:** Para desenvolvimento com Docker, as variáveis já estão configuradas no `docker-compose.dev.yml`.

---

## 🗄️ Banco de Dados

### Primeira Configuração

```bash
# 1. Iniciar PostgreSQL
docker compose -f docker-compose.dev.yml up -d postgres

# 2. Aguardar PostgreSQL ficar pronto
docker compose -f docker-compose.dev.yml logs postgres

# 3. Executar migrations
npx prisma migrate dev

# 4. (Opcional) Popular banco com dados iniciais
npm run seed-popup
```

### Acessar Banco de Dados

```bash
# Via Prisma Studio
npx prisma studio

# Via psql (dentro do container)
docker compose -f docker-compose.dev.yml exec postgres psql -U mediz -d mediz_db

# Via cliente externo
# Host: localhost
# Port: 5432
# User: mediz
# Password: mediz_password
# Database: mediz_db
```

### Resetar Banco de Dados

```bash
# Parar serviços
docker compose -f docker-compose.dev.yml down

# Remover volume (apaga todos os dados!)
docker volume rm mediz_postgres_dev_data

# Reiniciar e recriar
docker compose -f docker-compose.dev.yml up -d postgres
npx prisma migrate dev
```

---

## 🔴 Redis

### Acessar Redis

```bash
# Via redis-cli (dentro do container)
docker compose -f docker-compose.dev.yml exec redis redis-cli

# Comandos úteis
PING                    # Verificar conexão
KEYS *                  # Listar todas as chaves
FLUSHALL                # Limpar tudo (cuidado!)
```

---

## 📊 Comandos Úteis

### Gerenciar Serviços

```bash
# Iniciar serviços
docker compose -f docker-compose.dev.yml up -d

# Parar serviços
docker compose -f docker-compose.dev.yml down

# Ver logs
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml logs -f postgres
docker compose -f docker-compose.dev.yml logs -f redis

# Status dos serviços
docker compose -f docker-compose.dev.yml ps

# Reiniciar um serviço específico
docker compose -f docker-compose.dev.yml restart app
```

### Executar Comandos no Container

```bash
# Executar migrations
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev

# Executar script
docker compose -f docker-compose.dev.yml exec app npm run create-admin

# Acessar shell do container
docker compose -f docker-compose.dev.yml exec app sh
```

### Limpeza

```bash
# Parar e remover containers
docker compose -f docker-compose.dev.yml down

# Remover volumes (apaga dados!)
docker compose -f docker-compose.dev.yml down -v

# Limpar imagens não utilizadas
docker image prune -a

# Limpar tudo (cuidado!)
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### PostgreSQL não inicia

```bash
# Verificar logs
docker compose -f docker-compose.dev.yml logs postgres

# Verificar se porta 5432 está em uso
netstat -an | grep 5432  # Linux/Mac
netstat -an | findstr 5432  # Windows

# Se estiver em uso, alterar porta no docker-compose.dev.yml
ports:
  - "5433:5432"  # Usar porta 5433 no host
```

### Redis não inicia

```bash
# Verificar logs
docker compose -f docker-compose.dev.yml logs redis

# Verificar se porta 6379 está em uso
netstat -an | grep 6379  # Linux/Mac
netstat -an | findstr 6379  # Windows
```

### Aplicação não conecta ao banco

1. Verificar se PostgreSQL está rodando:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. Verificar `DATABASE_URL` no `.env.local`:
   ```
   DATABASE_URL=postgresql://mediz:mediz_password@localhost:5432/mediz_db?schema=public
   ```

3. Testar conexão:
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres psql -U mediz -d mediz_db -c "SELECT 1;"
   ```

### Erro de permissão

```bash
# No Linux/Mac, pode precisar ajustar permissões
sudo chown -R $USER:$USER .
```

### Build lento

```bash
# Usar cache do Docker
docker compose -f docker-compose.dev.yml build --no-cache

# Ou limpar cache e rebuild
docker builder prune
docker compose -f docker-compose.dev.yml build
```

---

## 🎯 Workflow Recomendado

### Desenvolvimento Diário

1. **Iniciar serviços:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d postgres redis
   ```

2. **Desenvolver localmente:**
   ```bash
   npm run dev
   ```

3. **Ao terminar:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

### Testar Build de Produção

```bash
# Build
docker compose build

# Iniciar
docker compose up -d

# Testar
curl http://localhost:3000/api/health
```

---

## 📝 Notas Importantes

1. **Volumes:** Dados do PostgreSQL e Redis são persistidos em volumes Docker
2. **Portas:** Certifique-se de que as portas 3000, 5432 e 6379 estão livres
3. **Hot-reload:** Funciona melhor rodando a aplicação fora do Docker em desenvolvimento
4. **Migrations:** Execute sempre após iniciar PostgreSQL pela primeira vez
5. **Prisma Data Proxy:** Não é necessário para desenvolvimento local com Docker

---

## 🔗 Links Úteis

- [Documentação Docker](https://docs.docker.com/)
- [Documentação Docker Compose](https://docs.docker.com/compose/)
- [Prisma com Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

---

**Pronto para desenvolver! 🚀**

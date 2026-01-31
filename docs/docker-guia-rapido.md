# 🚀 Guia Rápido - Docker (Sem Criar Manualmente)

## ✅ Não Precisa Criar Nada Manualmente!

O `docker-compose` cria **todos os containers automaticamente** quando você roda os comandos.

---

## 📝 Passo a Passo Simples

### 1️⃣ Primeira Vez (Setup Inicial)

```bash
# 1. Iniciar PostgreSQL e Redis (cria containers automaticamente)
docker compose -f docker-compose.dev.yml up -d postgres redis

# 2. Aguardar 10-20 segundos para serviços iniciarem
# Você pode verificar o status:
docker compose -f docker-compose.dev.yml ps

# 3. Executar migrations do banco
npx prisma migrate dev

# 4. (Opcional) Criar usuário admin
npm run create-admin
```

### 2️⃣ Desenvolvimento Diário

```bash
# Iniciar banco e Redis (se não estiverem rodando)
docker compose -f docker-compose.dev.yml up -d postgres redis

# Rodar aplicação normalmente (fora do Docker para hot-reload)
npm run dev
```

### 3️⃣ Parar Tudo

```bash
# Parar containers (mas mantém dados)
docker compose -f docker-compose.dev.yml down

# OU parar e remover volumes (apaga dados do banco!)
docker compose -f docker-compose.dev.yml down -v
```

---

## 🎯 O Que Acontece Automaticamente

Quando você roda `docker compose up`, ele:

1. ✅ **Baixa as imagens** (PostgreSQL, Redis) se não existirem
2. ✅ **Cria os containers** automaticamente
3. ✅ **Configura a rede** entre containers
4. ✅ **Cria volumes** para persistir dados
5. ✅ **Inicia os serviços** na ordem correta

**Você não precisa fazer nada no Docker Desktop!** Tudo é automático via linha de comando.

---

## 📊 Verificar Status

```bash
# Ver containers rodando
docker compose -f docker-compose.dev.yml ps

# Ver logs
docker compose -f docker-compose.dev.yml logs -f

# Ver logs de um serviço específico
docker compose -f docker-compose.dev.yml logs -f postgres
docker compose -f docker-compose.dev.yml logs -f redis
```

---

## 🔍 Comandos Úteis

```bash
# Ver todos os containers (rodando e parados)
docker ps -a

# Ver imagens baixadas
docker images

# Ver volumes criados
docker volume ls

# Limpar tudo (cuidado - apaga dados!)
docker compose -f docker-compose.dev.yml down -v
docker system prune -a
```

---

## ⚠️ Importante

- **Não precisa abrir Docker Desktop** - tudo funciona via terminal
- **Não precisa criar containers manualmente** - docker-compose faz isso
- **Dados são salvos automaticamente** em volumes Docker
- **Para resetar tudo**, use `docker compose down -v`

---

## 🐛 Se Algo Der Errado

```bash
# Parar tudo
docker compose -f docker-compose.dev.yml down

# Remover volumes e recomeçar
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d postgres redis

# Verificar se portas estão livres
# Windows PowerShell:
netstat -an | findstr "5432 6379"
```

---

**Pronto! É só rodar os comandos e tudo funciona automaticamente! 🎉**

# 🚀 Passo a Passo: Iniciar Containers Docker - meDIZ

## 📋 Resumo Rápido

**NÃO**, você não precisa apenas rodar `npm run dev`. Precisa:
1. ✅ Iniciar containers Docker (banco + Redis)
2. ✅ Depois rodar `npm run dev`

---

## 🎯 Passo a Passo Completo (Sempre)

### 1️⃣ Verificar se Docker Desktop está rodando

**Antes de tudo:**
- Abra o **Docker Desktop**
- Aguarde até aparecer "Docker Desktop is running" na bandeja do sistema
- Se não estiver rodando, os comandos vão falhar!

### 2️⃣ Iniciar Containers do Banco e Redis

```powershell
docker compose -f docker-compose.dev.yml up -d postgres redis
```

**O que isso faz:**
- ✅ Cria/Inicia container `mediz-postgres-dev` (PostgreSQL)
- ✅ Cria/Inicia container `mediz-redis-dev` (Redis)
- ✅ `-d` = roda em background (não trava o terminal)

**Aguarde 10-20 segundos** para os containers iniciarem completamente.

### 3️⃣ Verificar se Containers Estão Rodando

```powershell
docker compose -f docker-compose.dev.yml ps
```

**Deve mostrar:**
```
NAME                 STATUS
mediz-postgres-dev   Up (healthy)
mediz-redis-dev      Up (healthy)
```

### 4️⃣ Rodar a Aplicação

```powershell
npm run dev
```

**O que isso faz:**
- ✅ Inicia o Next.js localmente (não no Docker)
- ✅ Conecta no banco Docker automaticamente
- ✅ Usa `.env.local` (que aponta para Docker)
- ✅ Aplicação fica em: http://localhost:3000

---

## 🐳 O Que Está no Docker Desktop?

Quando você olha no Docker Desktop, verá:

### Containers Ativos:
- ✅ **mediz-postgres-dev** (PostgreSQL)
- ✅ **mediz-redis-dev** (Redis)
- ❌ **mediz-app-dev** (NÃO aparece - só se você iniciar tudo no Docker)

### Por Que "mediz" Aparece?

O nome "mediz" é o **nome do projeto** do docker-compose. Todos os containers têm esse prefixo:
- `mediz-postgres-dev`
- `mediz-redis-dev`
- `mediz-app-dev`

---

## 📝 Comandos Completos (Copiar e Colar)

### Iniciar Tudo (Primeira Vez ou Depois de Reiniciar PC)

```powershell
# 1. Verificar Docker Desktop está rodando
# (Abra o Docker Desktop se não estiver)

# 2. Iniciar containers
docker compose -f docker-compose.dev.yml up -d postgres redis

# 3. Aguardar 10-20 segundos

# 4. Verificar status
docker compose -f docker-compose.dev.yml ps

# 5. Rodar aplicação
npm run dev
```

### Parar Tudo (Ao Terminar de Trabalhar)

```powershell
# Parar containers (mas mantém dados)
docker compose -f docker-compose.dev.yml down

# OU parar e apagar dados (cuidado!)
docker compose -f docker-compose.dev.yml down -v
```

---

## 🔄 Fluxo Diário de Trabalho

### Manhã (Iniciar Trabalho)

```powershell
# 1. Abrir Docker Desktop (se não estiver)
# 2. Iniciar containers
docker compose -f docker-compose.dev.yml up -d postgres redis

# 3. Aguardar containers iniciarem
# 4. Rodar app
npm run dev
```

### Noite (Finalizar Trabalho)

```powershell
# Parar containers (opcional - podem ficar rodando)
docker compose -f docker-compose.dev.yml down
```

**Dica:** Você pode deixar os containers rodando! Eles não consomem muitos recursos quando não estão em uso.

---

## ⚠️ Problemas Comuns

### Erro: "Docker Desktop não está rodando"

**Solução:** Abra o Docker Desktop e aguarde iniciar completamente.

### Erro: "Porta 5432 já está em uso"

**Solução:** Alguém já está usando a porta. Pare outros serviços PostgreSQL ou altere a porta no `docker-compose.dev.yml`.

### Containers não aparecem no Docker Desktop

**Solução:** 
```powershell
# Verificar se estão rodando
docker compose -f docker-compose.dev.yml ps

# Se não aparecerem, iniciar novamente
docker compose -f docker-compose.dev.yml up -d postgres redis
```

---

## 🎯 Resumo Visual

```
┌─────────────────────────────────────┐
│  Docker Desktop                     │
├─────────────────────────────────────┤
│  ✅ mediz-postgres-dev (PostgreSQL) │
│  ✅ mediz-redis-dev (Redis)         │
│  ❌ mediz-app-dev (não usado)       │
└─────────────────────────────────────┘
         ↓
    Conecta via
    localhost:5432
         ↓
┌─────────────────────────────────────┐
│  Seu Computador                     │
├─────────────────────────────────────┤
│  npm run dev                        │
│  → Next.js (localhost:3000)         │
│  → Usa .env.local                   │
│  → Conecta no Docker                │
└─────────────────────────────────────┘
```

---

## ✅ Checklist Rápido

Antes de rodar `npm run dev`, verifique:

- [ ] Docker Desktop está rodando?
- [ ] Containers `mediz-postgres-dev` e `mediz-redis-dev` estão rodando?
- [ ] Arquivo `.env.local` existe e tem `DATABASE_URL` apontando para Docker?
- [ ] Portas 5432 e 6379 estão livres?

**Se tudo OK, pode rodar `npm run dev`!** 🚀

---

## 🆘 Comandos de Emergência

```powershell
# Ver todos os containers
docker ps -a

# Ver logs de um container
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml logs redis

# Reiniciar um container
docker compose -f docker-compose.dev.yml restart postgres

# Parar tudo e recomeçar
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d postgres redis
```

---

**Pronto! Agora você sabe exatamente o que fazer! 🎉**

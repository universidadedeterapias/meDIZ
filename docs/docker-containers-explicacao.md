# 🐳 Containers Docker - Explicação

## ✅ Você JÁ TEM Container para a Aplicação!

No `docker-compose.dev.yml`, existem **3 containers**:

1. **`postgres`** - Banco de dados PostgreSQL
2. **`redis`** - Cache Redis  
3. **`app`** - **Next.js completo (Backend + Frontend juntos)** ← Este é o container da aplicação!

---

## 🤔 Por Que Não Separar Backend e Frontend?

### Next.js é Full-Stack

No **Next.js**, backend e frontend estão **na mesma aplicação**:

```
┌─────────────────────────────────────┐
│  Container: mediz-app-dev            │
│  (Next.js na porta 3000)            │
├─────────────────────────────────────┤
│  ✅ Frontend (React)                │
│     - Páginas em src/app/           │
│     - Componentes React             │
│                                     │
│  ✅ Backend (API Routes)           │
│     - APIs em src/app/api/          │
│     - Server Components             │
│                                     │
│  Tudo roda junto na porta 3000!    │
└─────────────────────────────────────┘
```

**Não precisa separar!** O Next.js já faz isso internamente.

---

## 🎯 Como Usar os Containers

### Opção 1: Apenas Infraestrutura no Docker (Recomendado)

```bash
# Iniciar apenas banco e Redis
docker compose -f docker-compose.dev.yml up -d postgres redis

# Rodar app localmente (hot-reload funciona melhor)
npm run dev
```

**Containers ativos:**
- ✅ `mediz-postgres-dev` (banco)
- ✅ `mediz-redis-dev` (cache)
- ❌ `mediz-app-dev` (não usado - app roda localmente)

### Opção 2: Tudo no Docker (Incluindo App)

```bash
# Iniciar TUDO (banco + redis + app)
docker compose -f docker-compose.dev.yml up --build
```

**Containers ativos:**
- ✅ `mediz-postgres-dev` (banco)
- ✅ `mediz-redis-dev` (cache)
- ✅ `mediz-app-dev` (aplicação Next.js)

**Acesso:** http://localhost:3000

---

## 📊 Estrutura Completa

```
Docker Compose
├── postgres (PostgreSQL)
│   └── Porta: 5432
│
├── redis (Redis Cache)
│   └── Porta: 6379
│
└── app (Next.js Full-Stack)
    ├── Frontend (React)
    ├── Backend (API Routes)
    └── Porta: 3000
```

---

## 🎯 Resumo

- ✅ **Você já tem container para a aplicação** (`app` no docker-compose)
- ✅ **Next.js é full-stack** (backend + frontend juntos)
- ✅ **Não precisa separar** em containers diferentes
- ✅ **Para desenvolvimento**, recomendo apenas banco/Redis no Docker
- ✅ **Para produção**, pode rodar tudo no Docker

**Tudo está configurado corretamente!** 🚀

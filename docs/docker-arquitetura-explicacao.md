# 🐳 Arquitetura Docker - meDIZ

## 📐 Estrutura Atual

### Next.js = Full-Stack (Backend + Frontend Juntos)

No **Next.js**, não há separação entre backend e frontend:
- **Frontend:** Páginas React em `src/app/`
- **Backend:** API Routes em `src/app/api/`
- **Tudo roda na mesma aplicação** na porta 3000

---

## 🐳 Containers Docker

### Configuração Atual (`docker-compose.dev.yml`)

```
┌─────────────────────────────────────────┐
│  Docker Compose                          │
├─────────────────────────────────────────┤
│  1. postgres (PostgreSQL)                │
│     - Porta: 5432                         │
│     - Banco: mediz_db                    │
│     - User: mediz / mediz_password       │
│                                           │
│  2. redis (Redis Cache)                  │
│     - Porta: 6379                        │
│                                           │
│  3. app (Next.js - Backend + Frontend)   │
│     - Porta: 3000                         │
│     - Container: mediz-app-dev            │
│     - Hot-reload habilitado              │
└─────────────────────────────────────────┘
```

---

## 🎯 Duas Formas de Usar

### Opção 1: Apenas Banco e Redis no Docker (Recomendado para Dev)

```bash
# Iniciar apenas serviços de infraestrutura
docker compose -f docker-compose.dev.yml up -d postgres redis

# Rodar aplicação localmente (hot-reload funciona melhor)
npm run dev
```

**Vantagens:**
- ✅ Hot-reload mais rápido
- ✅ Debug mais fácil
- ✅ Menos recursos usados
- ✅ Aplicação usa `.env.local` automaticamente

### Opção 2: Tudo no Docker (Incluindo App)

```bash
# Iniciar tudo (banco + redis + app)
docker compose -f docker-compose.dev.yml up --build

# A aplicação estará em: http://localhost:3000
```

**Vantagens:**
- ✅ Ambiente completamente isolado
- ✅ Consistência total
- ✅ Pronto para produção

**Desvantagens:**
- ⚠️ Hot-reload pode ser mais lento
- ⚠️ Debug mais difícil

---

## 🔄 Por Que Não Separar Backend e Frontend?

### Next.js é Full-Stack por Design

```
┌─────────────────────────────────────┐
│  Next.js App (Porta 3000)           │
├─────────────────────────────────────┤
│  Frontend (React)                    │
│  - src/app/login/page.tsx            │
│  - src/app/chat/page.tsx             │
│  - src/app/admin/page.tsx           │
│                                     │
│  Backend (API Routes)               │
│  - src/app/api/auth/route.ts        │
│  - src/app/api/openai/route.ts     │
│  - src/app/api/admin/route.ts      │
│                                     │
│  Server Components                  │
│  - Renderização no servidor         │
└─────────────────────────────────────┘
```

**Tudo roda junto!** Não precisa separar.

---

## 🏗️ Se Quiser Separar (Não Recomendado)

Se você realmente quisesse separar (não é necessário), seria assim:

```yaml
services:
  # Backend separado (Express, FastAPI, etc)
  backend:
    build: ./backend
    ports:
      - "4000:4000"
  
  # Frontend separado (React puro)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

**Mas isso não faz sentido para Next.js!** O Next.js já é full-stack.

---

## ✅ Recomendação para Você

### Desenvolvimento Diário

```bash
# 1. Iniciar apenas banco e Redis
docker compose -f docker-compose.dev.yml up -d postgres redis

# 2. Rodar app localmente
npm run dev
```

### Testar Ambiente Completo no Docker

```bash
# Iniciar tudo (incluindo app)
docker compose -f docker-compose.dev.yml up --build
```

---

## 📊 Resumo

| Componente | Onde Roda | Container |
|------------|-----------|-----------|
| **PostgreSQL** | Docker | `mediz-postgres-dev` |
| **Redis** | Docker | `mediz-redis-dev` |
| **Next.js App** | Local (dev) ou Docker (opcional) | `mediz-app-dev` (se usar) |
| **Frontend** | Dentro do Next.js | - |
| **Backend (API)** | Dentro do Next.js | - |

---

## 🎯 Conclusão

**Você já tem tudo configurado!** O container `app` existe no `docker-compose.dev.yml`, mas é **opcional** usá-lo em desenvolvimento. 

Para desenvolvimento, recomendo:
- ✅ Banco e Redis no Docker
- ✅ App Next.js rodando localmente (`npm run dev`)

Isso dá o melhor dos dois mundos: infraestrutura isolada + desenvolvimento rápido! 🚀

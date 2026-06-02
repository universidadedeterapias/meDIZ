# 🔧 Configuração de Variáveis de Ambiente para Docker

## ⚠️ Problema Comum

Ao rodar `npx prisma migrate dev`, você pode receber erro:
```
Error: P1001: Can't reach database server at `db.prisma.io:5432`
```

Isso acontece porque o Prisma está tentando conectar ao **Prisma Data Proxy** (produção) em vez do banco **local do Docker**.

---

## ✅ Solução

### 1. Criar arquivo `.env.local`

Crie um arquivo `.env.local` na raiz do projeto com:

```env
# Database - Docker Local
DATABASE_URL="postgresql://mediz:mediz_password@localhost:5432/mediz_db?schema=public"

# Redis - Docker Local  
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-change-in-production"
```

### 2. Por que `.env.local`?

- O Next.js carrega `.env.local` **antes** do `.env`
- Assim você pode ter configurações diferentes para desenvolvimento e produção
- O `.env.local` não deve ser commitado no Git (já está no `.gitignore`)

### 3. Verificar se funcionou

```bash
# Verificar se Prisma consegue conectar
npx prisma migrate dev
```

---

## 📝 Estrutura de Arquivos

```
meDIZ/
├── .env              # Produção (Prisma Data Proxy)
├── .env.local        # Desenvolvimento (Docker Local) ← CRIE ESTE
└── .env.local.example # Exemplo (template)
```

---

## 🔄 Quando Usar Cada Um

### `.env` (Produção)
- Usa Prisma Data Proxy: `db.prisma.io:5432`
- Para deploy na Vercel
- Não modifique este arquivo

### `.env.local` (Desenvolvimento)
- Usa Docker local: `localhost:5432`
- Para desenvolvimento na sua máquina
- Crie este arquivo baseado no `.env.local.example`

---

## 🚀 Comandos Rápidos

```bash
# 1. Criar .env.local (copiar do exemplo)
cp .env.local.example .env.local

# 2. Editar se necessário
# (Ajuste GOOGLE_CLIENT_ID, etc. se tiver)

# 3. Executar migrations
npx prisma migrate dev

# 4. Rodar aplicação
npm run dev
```

---

## ⚠️ Importante

- **Nunca commite `.env.local`** no Git (já está no `.gitignore`)
- **Use `.env.local` apenas para desenvolvimento local**
- **Para produção, use as variáveis de ambiente da Vercel**

---

**Pronto! Agora o Prisma vai conectar no Docker local! 🎉**

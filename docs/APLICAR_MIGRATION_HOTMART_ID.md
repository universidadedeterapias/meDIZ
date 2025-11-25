# Como Aplicar a Migration do hotmartId

## ⚠️ IMPORTANTE

O campo `hotmartId` foi adicionado ao schema Prisma, mas precisa ser aplicado no banco de dados.

## Opção 1: Aplicar via Deploy (Recomendado)

A migration já está criada em:
```
prisma/migrations/20250122120000_add_hotmart_id/migration.sql
```

Quando você fizer o próximo deploy na Vercel, a migration será aplicada automaticamente.

## Opção 2: Aplicar Manualmente no Banco

Se você tem acesso ao banco de dados (via Prisma Studio, pgAdmin, ou outro cliente), execute este SQL:

```sql
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "hotmartId" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_hotmartId_key" ON "Plan"("hotmartId") WHERE "hotmartId" IS NOT NULL;
```

## Opção 3: Marcar Migration como Aplicada

Se você já aplicou manualmente, marque a migration como aplicada:

```bash
npx prisma migrate resolve --applied 20250122120000_add_hotmart_id
```

## Depois de Aplicar

Após aplicar a migration, execute:

```bash
npm run sync-hotmart-plans
```

Isso vai preencher o `hotmartId` em todos os planos existentes.

## Verificar se Funcionou

Execute:

```bash
npm run verify-hotmart-plans
```

Você deve ver os planos com `hotmartId` preenchido.


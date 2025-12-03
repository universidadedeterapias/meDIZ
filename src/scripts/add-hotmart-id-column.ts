// src/scripts/add-hotmart-id-column.ts
// Adiciona a coluna hotmartId à tabela Plan se não existir
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔄 Adicionando coluna hotmartId à tabela Plan...\n')
    
    // Executar SQL diretamente
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "hotmartId" INTEGER;
    `)
    
    console.log('✅ Coluna hotmartId adicionada (se não existia)')
    
    // Criar índice único se não existir
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Plan_hotmartId_key" 
      ON "Plan"("hotmartId") 
      WHERE "hotmartId" IS NOT NULL;
    `)
    
    console.log('✅ Índice único criado (se não existia)')
    
    // Regenerar Prisma Client
    console.log('\n🔄 Regenerando Prisma Client...')
    const { execSync } = require('child_process')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    console.log('\n✅ Pronto! Agora você pode executar: npm run sync-hotmart-plans')
    
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

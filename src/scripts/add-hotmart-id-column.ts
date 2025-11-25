// Script para adicionar coluna hotmartId manualmente
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addHotmartIdColumn() {
  try {
    console.log('🔄 Adicionando coluna hotmartId à tabela Plan...\n')

    // Executar SQL diretamente
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Plan" 
      ADD COLUMN IF NOT EXISTS "hotmartId" INTEGER;
    `)

    console.log('✅ Coluna hotmartId adicionada')

    // Criar índice único
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Plan_hotmartId_key" 
      ON "Plan"("hotmartId") 
      WHERE "hotmartId" IS NOT NULL;
    `)

    console.log('✅ Índice único criado')
    console.log('\n🎉 Campo hotmartId adicionado com sucesso!')
    console.log('\n📝 Próximo passo: Execute "npm run sync-hotmart-plans" para preencher os IDs')

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  addHotmartIdColumn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { addHotmartIdColumn }


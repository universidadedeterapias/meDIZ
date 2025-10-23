// src/scripts/fix-verification-token-production.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixVerificationTokenTable() {
  try {
    console.log('🔧 Verificando estrutura da tabela VerificationToken...')
    
    // Verificar se a tabela tem o campo 'id'
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'VerificationToken' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
    
    console.log('📋 Estrutura atual da tabela:')
    console.table(result)
    
    // Verificar se existe o campo 'id'
    const hasIdField = Array.isArray(result) && result.some((row: any) => row.column_name === 'id')
    
    if (!hasIdField) {
      console.log('⚠️ Campo "id" não encontrado. Aplicando correção...')
      
      // Adicionar campo id
      await prisma.$executeRaw`
        ALTER TABLE "VerificationToken" 
        ADD COLUMN "id" TEXT NOT NULL DEFAULT gen_random_uuid();
      `
      
      // Tornar o campo id único
      await prisma.$executeRaw`
        ALTER TABLE "VerificationToken" 
        ADD CONSTRAINT "VerificationToken_id_key" UNIQUE ("id");
      `
      
      // Tornar o campo id a chave primária
      await prisma.$executeRaw`
        ALTER TABLE "VerificationToken" 
        ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id");
      `
      
      console.log('✅ Campo "id" adicionado com sucesso!')
    } else {
      console.log('✅ Campo "id" já existe. Estrutura OK!')
    }
    
    // Verificar se há dados na tabela
    const count = await prisma.verificationToken.count()
    console.log(`📊 Total de tokens na tabela: ${count}`)
    
    if (count > 0) {
      console.log('🧹 Limpando tokens expirados...')
      const deleted = await prisma.verificationToken.deleteMany({
        where: {
          expires: {
            lt: new Date()
          }
        }
      })
      console.log(`🗑️ ${deleted.count} tokens expirados removidos`)
    }
    
    console.log('🎉 Verificação concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixVerificationTokenTable()
}

export { fixVerificationTokenTable }

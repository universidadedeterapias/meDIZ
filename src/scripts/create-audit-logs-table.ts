#!/usr/bin/env tsx

/**
 * Script para criar a tabela audit_logs manualmente
 */

import { prisma } from '@/lib/prisma'

async function createAuditLogsTable() {
  console.log('🔧 Criando tabela audit_logs...')

  try {
    // Conectar ao banco
    await prisma.$connect()
    console.log('✅ Conectado ao banco')

    // Tentar criar um registro de teste para forçar a criação da tabela
    const testAuditLog = await prisma.auditLog.create({
      data: {
        adminId: '00000000-0000-0000-0000-000000000000', // UUID fake para teste
        adminEmail: 'test@mediz.com',
        action: 'TEST_CREATE',
        resource: 'test',
        details: JSON.stringify({ test: true }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-script'
      }
    })

    console.log('✅ Tabela audit_logs criada com sucesso!')
    console.log(`   ID do registro de teste: ${testAuditLog.id}`)

    // Deletar o registro de teste
    await prisma.auditLog.delete({
      where: { id: testAuditLog.id }
    })
    console.log('✅ Registro de teste removido')

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error)
    
    // Se o erro for relacionado ao relacionamento com User, vamos tentar uma abordagem diferente
    if (error instanceof Error && error.message.includes('User')) {
      console.log('🔧 Tentando criar tabela sem relacionamento...')
      
      try {
        // Usar SQL direto para criar a tabela
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "audit_logs" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "adminId" TEXT NOT NULL,
            "adminEmail" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "resource" TEXT NOT NULL,
            "resourceId" TEXT,
            "details" TEXT,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        console.log('✅ Tabela criada com SQL direto!')
        
        // Criar índices
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_adminId_idx" ON "audit_logs"("adminId")`
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp")`
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action")`
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs"("resource")`
        
        console.log('✅ Índices criados!')
        
      } catch (sqlError) {
        console.error('❌ Erro ao criar tabela com SQL:', sqlError)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  createAuditLogsTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Erro fatal:', error)
      process.exit(1)
    })
}

export { createAuditLogsTable }

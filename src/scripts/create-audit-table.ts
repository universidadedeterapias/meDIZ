#!/usr/bin/env tsx

/**
 * Script para criar a tabela audit_logs manualmente
 */

import { prisma } from '@/lib/prisma'

async function createAuditTable() {
  console.log('🔧 Criando tabela audit_logs manualmente...')

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco')

    // Criar a tabela usando SQL direto
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
    
    console.log('✅ Tabela audit_logs criada')

    // Criar índices
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_adminId_idx" ON "audit_logs"("adminId")`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs"("timestamp")`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action")`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs"("resource")`
    
    console.log('✅ Índices criados')

    // Testar se a tabela funciona
    const testLog = await prisma.auditLog.create({
      data: {
        adminId: 'test-admin-id',
        adminEmail: 'test@mediz.com',
        action: 'TEST',
        resource: 'test',
        details: JSON.stringify({ test: true }),
        ipAddress: '127.0.0.1',
        userAgent: 'test-script'
      }
    })

    console.log(`✅ Teste de criação funcionou: ${testLog.id}`)

    // Deletar o teste
    await prisma.auditLog.delete({
      where: { id: testLog.id }
    })

    console.log('✅ Teste removido')
    console.log('🎉 Tabela audit_logs funcionando!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAuditTable()

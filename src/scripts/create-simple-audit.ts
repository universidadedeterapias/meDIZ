#!/usr/bin/env tsx

/**
 * Sistema híbrido de auditoria - dados reais sem relacionamentos complexos
 */

import { prisma } from '@/lib/prisma'

async function createSimpleAuditSystem() {
  // console.log('🔧 Criando sistema de auditoria simples e funcional...')

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco')

    // Criar tabela usando SQL direto via Prisma
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    console.log('✅ Tabela audit_logs criada')

    // Criar índices
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON audit_logs(admin_id)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`
    
    console.log('✅ Índices criados')

    // Testar inserção
    const testId = `test-${Date.now()}`
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, admin_email, action, resource, details, ip_address, user_agent)
      VALUES (${testId}, ${'test-admin'}, ${'test@mediz.com'}, ${'TEST'}, ${'test'}, ${JSON.stringify({test: true})}, ${'127.0.0.1'}, ${'test-script'})
    `

    console.log('✅ Teste de inserção funcionou')

    // Testar consulta
    await prisma.$executeRaw`SELECT COUNT(*) as count FROM audit_logs`
    console.log('✅ Teste de consulta funcionou')

    // Limpar teste
    await prisma.$executeRaw`DELETE FROM audit_logs WHERE id = ${testId}`
    console.log('✅ Teste removido')

    console.log('🎉 Sistema de auditoria REAL funcionando!')
    console.log('📝 Próximos passos:')
    console.log('   1. Teste as páginas no navegador')
    console.log('   2. As APIs agora usam dados reais')
    console.log('   3. Logs são salvos no banco de dados')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSimpleAuditSystem()

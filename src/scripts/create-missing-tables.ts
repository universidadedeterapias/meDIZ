#!/usr/bin/env tsx

/**
 * Script para criar as tabelas que estão faltando
 */

import { prisma } from '@/lib/prisma'

async function createMissingTables() {
  console.log('🔧 Criando tabelas que estão faltando...\n')

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco')

    // 1. Criar tabela audit_logs
    console.log('1. 📊 Criando tabela audit_logs...')
    
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

    // Criar índices para audit_logs
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON audit_logs(admin_id)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource)`
    
    console.log('✅ Índices de audit_logs criados')

    // 2. Criar tabela admin_requests
    console.log('\n2. 📋 Criando tabela admin_requests...')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS admin_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by TEXT,
        reviewer_email TEXT,
        notes TEXT
      )
    `
    
    console.log('✅ Tabela admin_requests criada')

    // Criar índices para admin_requests
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_admin_req_status ON admin_requests(status)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_admin_req_requested_at ON admin_requests(requested_at)`
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_admin_req_user_email ON admin_requests(user_email)`
    
    console.log('✅ Índices de admin_requests criados')

    // 3. Testar as tabelas
    console.log('\n3. 🧪 Testando as tabelas...')
    
    // Testar audit_logs
    const auditCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM audit_logs`
    console.log(`✅ audit_logs: ${(auditCount as Record<string, unknown>[])[0].count} registros`)
    
    // Testar admin_requests
    const requestsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM admin_requests`
    console.log(`✅ admin_requests: ${(requestsCount as Record<string, unknown>[])[0].count} registros`)

    // 4. Criar alguns dados de teste
    console.log('\n4. 📝 Criando dados de teste...')
    
    // Log de teste
    const auditId = `audit-test-${Date.now()}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      auditId,
      'test-admin',
      'test@mediz.com',
      'TEST_CREATE',
      'admin_request',
      JSON.stringify({ test: true }),
      '127.0.0.1',
      'test-script'
    )
    
    console.log('✅ Log de teste criado')
    
    // Solicitação de teste
    const requestId = `admin-req-test-${Date.now()}`
    await prisma.$executeRawUnsafe(
      `INSERT INTO admin_requests (id, user_id, user_email, user_name, reason, status, requested_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
      requestId,
      'test-user',
      'test@exemplo.com',
      'Usuário Teste',
      'Teste do sistema de solicitações',
      new Date()
    )
    
    console.log('✅ Solicitação de teste criada')

    // 5. Verificar dados criados
    console.log('\n5. ✅ Verificando dados criados...')
    
    const finalAuditCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM audit_logs`
    const finalRequestsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM admin_requests`
    
    console.log(`✅ audit_logs: ${(finalAuditCount as Record<string, unknown>[])[0].count} registros`)
    console.log(`✅ admin_requests: ${(finalRequestsCount as Record<string, unknown>[])[0].count} registros`)

    console.log('\n🎉 TABELAS CRIADAS COM SUCESSO!')
    console.log('\n📝 Resumo:')
    console.log('   ✅ Tabela audit_logs criada com índices')
    console.log('   ✅ Tabela admin_requests criada com índices')
    console.log('   ✅ Dados de teste criados')
    console.log('   ✅ APIs devem funcionar agora')
    
    console.log('\n🚀 Próximos passos:')
    console.log('   1. Teste a página /admin/admin-requests')
    console.log('   2. Deve mostrar a solicitação de teste')
    console.log('   3. Sistema de autorização funcionando')

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMissingTables()

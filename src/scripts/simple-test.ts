#!/usr/bin/env tsx

/**
 * Teste simples para verificar se o sistema real está funcionando
 */

import { prisma } from '@/lib/prisma'

async function simpleTest() {
  console.log('🔍 Teste simples do sistema real...')

  try {
    await prisma.$connect()
    console.log('✅ Banco conectado')

    const count = await prisma.auditLog.count()
    console.log(`✅ Tabela audit_logs existe com ${count} registros`)

    // Criar um log de teste
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

    console.log(`✅ Log de teste criado: ${testLog.id}`)

    // Buscar o log criado
    const foundLog = await prisma.auditLog.findUnique({
      where: { id: testLog.id }
    })

    if (foundLog) {
      console.log('✅ Log encontrado no banco')
    } else {
      console.log('❌ Log não encontrado')
    }

    // Deletar o log de teste
    await prisma.auditLog.delete({
      where: { id: testLog.id }
    })

    console.log('✅ Log de teste removido')
    console.log('🎉 Sistema real funcionando!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simpleTest()

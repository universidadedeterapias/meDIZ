#!/usr/bin/env tsx

/**
 * Script para verificar dados reais do banco
 */

import { prisma } from '@/lib/prisma'

async function checkRealData() {
  console.log('🔍 Verificando dados reais do banco...\n')

  try {
    await prisma.$connect()
    console.log('✅ Conectado ao banco')

    // 1. Verificar usuários
    console.log('1. 👥 USUÁRIOS:')
    try {
      const totalUsers = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`
      console.log(`   Total: ${(totalUsers as Record<string, unknown>[])[0].count}`)
      
      const recentUsers = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
      console.log(`   Últimos 7 dias: ${(recentUsers as Record<string, unknown>[])[0].count}`)
      
      // Listar alguns usuários
      const users = await prisma.$queryRaw`SELECT name, email, created_at FROM users ORDER BY created_at DESC LIMIT 3`
      console.log('   Últimos usuários:')
      ;(users as Record<string, unknown>[]).forEach((user, i) => {
        console.log(`     ${i+1}. ${user.name} (${user.email}) - ${user.created_at}`)
      })
    } catch (error) {
      console.log('   ❌ Erro:', error.message)
    }

    // 2. Verificar assinaturas
    console.log('\n2. 💳 ASSINATURAS:')
    try {
      const totalSubs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM subscriptions`
      console.log(`   Total: ${(totalSubs as Record<string, unknown>[])[0].count}`)
      
      const activeSubs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'`
      console.log(`   Ativas: ${(activeSubs as Record<string, unknown>[])[0].count}`)
      
      // Listar assinaturas
      const subs = await prisma.$queryRaw`SELECT status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 5`
      console.log('   Últimas assinaturas:')
      ;(subs as Record<string, unknown>[]).forEach((sub, i) => {
        console.log(`     ${i+1}. Status: ${sub.status} - ${sub.created_at}`)
      })
    } catch (error) {
      console.log('   ❌ Erro:', error.message)
    }

    // 3. Verificar admin requests
    console.log('\n3. 🛡️ SOLICITAÇÕES ADMIN:')
    try {
      const totalRequests = await prisma.$queryRaw`SELECT COUNT(*) as count FROM admin_requests`
      console.log(`   Total: ${(totalRequests as Record<string, unknown>[])[0].count}`)
      
      const pendingRequests = await prisma.$queryRaw`SELECT COUNT(*) as count FROM admin_requests WHERE status = 'PENDING'`
      console.log(`   Pendentes: ${(pendingRequests as Record<string, unknown>[])[0].count}`)
    } catch (error) {
      console.log('   ❌ Erro:', error.message)
    }

    // 4. Verificar audit logs
    console.log('\n4. 📋 LOGS DE AUDITORIA:')
    try {
      const totalLogs = await prisma.$queryRaw`SELECT COUNT(*) as count FROM audit_logs`
      console.log(`   Total: ${(totalLogs as Record<string, unknown>[])[0].count}`)
      
      const recentLogs = await prisma.$queryRaw`SELECT action, admin_email, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 3`
      console.log('   Últimos logs:')
      ;(recentLogs as Record<string, unknown>[]).forEach((log, i) => {
        console.log(`     ${i+1}. ${log.action} - ${log.admin_email} - ${log.timestamp}`)
      })
    } catch (error) {
      console.log('   ❌ Erro:', error.message)
    }

    console.log('\n🎉 VERIFICAÇÃO CONCLUÍDA!')

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRealData()

// src/scripts/check-auth.ts
/**
 * Script para verificar configurações de autenticação
 * 
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/check-auth.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAuth() {
  console.log('🔍 Verificando configurações de autenticação...')
  
  // Verificar variáveis de ambiente essenciais
  console.log('\n📋 Variáveis de ambiente:')
  console.log(`- NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`)
  
  // Verificar usuários no banco de dados
  console.log('\n📋 Usuários no banco de dados:')
  try {
    const userCount = await prisma.user.count()
    console.log(`- Total de usuários: ${userCount}`)
    
    // Contar usuários por domínio de email
    const users = await prisma.user.findMany({ select: { email: true } })
    const domains: Record<string, number> = {}
    
    users.forEach(user => {
      if (user.email) {
        const domain = user.email.split('@')[1]
        domains[domain] = (domains[domain] || 0) + 1
      }
    })
    
    console.log('- Usuários por domínio de email:')
    Object.entries(domains).forEach(([domain, count]) => {
      console.log(`  - ${domain}: ${count}`)
    })
    
    // Verificar usuários admin (@mediz.com)
    const adminUsers = users.filter(u => u.email?.includes('@mediz.com'))
    console.log(`- Usuários admin (@mediz.com): ${adminUsers.length}`)
    
    if (adminUsers.length > 0) {
      console.log('- Lista de emails admin:')
      adminUsers.forEach(user => {
        console.log(`  - ${user.email}`)
      })
    } else {
      console.log('❌ Nenhum usuário admin encontrado!')
      console.log('  Execute o script create-admin.ts para criar um usuário admin.')
    }
  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error)
  }
  
  // Verificar sessões ativas
  console.log('\n📋 Sessões:')
  try {
    const sessionCount = await prisma.session.count()
    console.log(`- Sessões ativas: ${sessionCount}`)
    
    if (sessionCount > 0) {
      const recentSessions = await prisma.session.findMany({
        take: 5,
        orderBy: { expires: 'desc' },
        include: { user: true }
      })
      
      console.log('- Sessões recentes:')
      recentSessions.forEach(session => {
        console.log(`  - Usuário: ${session.user?.email || 'desconhecido'}`)
        console.log(`    Expira em: ${session.expires.toLocaleString()}`)
      })
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessões:', error)
  }
  
  // Concluir
  console.log('\n✅ Verificação concluída!')
}

// Executar a função
checkAuth()
  .catch((error) => {
    console.error('❌ Erro inesperado:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

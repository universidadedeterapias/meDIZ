// src/scripts/diagnose-auth-error.ts
/**
 * Script para diagnosticar problemas de autenticação
 * 
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/diagnose-auth-error.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseAuthError() {
  console.log('🔍 Diagnóstico de problemas de autenticação...')
  
  // 1. Verificar variáveis de ambiente
  console.log('\n📋 Variáveis de ambiente:')
  console.log(`- NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Configurado' : '❌ Não configurado'}`)
  console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`)
  
  // 2. Testar conexão com banco de dados
  console.log('\n🗄️ Testando conexão com banco de dados...')
  try {
    await prisma.$connect()
    console.log('✅ Conexão com banco de dados OK')
    
    // Verificar tabelas necessárias
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    ` as Array<{ table_name: string }>
    
    console.log('\n📋 Tabelas encontradas:')
    const requiredTables = ['User', 'Account', 'Session', 'VerificationToken']
    const foundTables = tables.map(t => t.table_name)
    
    requiredTables.forEach(table => {
      const exists = foundTables.includes(table)
      console.log(`- ${table}: ${exists ? '✅ Existe' : '❌ Não encontrada'}`)
    })
    
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error)
  }
  
  // 3. Verificar usuários existentes
  console.log('\n👥 Usuários no banco:')
  try {
    const userCount = await prisma.user.count()
    console.log(`- Total de usuários: ${userCount}`)
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, appUsage: true },
        take: 5
      })
      
      console.log('\n📋 Primeiros usuários:')
      users.forEach(user => {
        const isAdmin = user.appUsage === 'ADMIN'
        console.log(`- ${user.email} (${user.name}) - Admin: ${isAdmin ? 'Sim' : 'Não'}`)
      })
    }
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error)
  }
  
  // 4. Verificar configuração do NextAuth
  console.log('\n🔐 Configuração NextAuth:')
  try {
    // Testar se o auth.ts pode ser importado
    await import('@/auth')
    console.log('✅ auth.ts importado com sucesso')
    
    // Testar se o PrismaAdapter pode ser usado
    await import('@auth/prisma-adapter')
    console.log('✅ PrismaAdapter disponível')
    
  } catch (error) {
    console.error('❌ Erro na configuração NextAuth:', error)
  }
  
  // 5. Verificar middleware
  console.log('\n🛡️ Middleware:')
  try {
    await import('@/middleware')
    console.log('✅ middleware.ts importado com sucesso')
  } catch (error) {
    console.error('❌ Erro no middleware:', error)
  }
  
  console.log('\n✅ Diagnóstico concluído!')
}

// Executar diagnóstico
diagnoseAuthError()
  .catch((error) => {
    console.error('❌ Erro inesperado:', error)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })

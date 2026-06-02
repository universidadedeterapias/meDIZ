// Script simples para testar conexão e sessões
import { prisma } from '../lib/prisma'

async function testSessions() {
  console.log('🔍 Testando conexão e sessões...')
  
  try {
    // Testa conexão
    await prisma.$connect()
    console.log('✅ Conexão com banco estabelecida')
    
    // Conta sessões
    const totalSessions = await prisma.chatSession.count()
    console.log(`📊 Total de sessões: ${totalSessions}`)
    
    // Busca sessões com threadId
    const sessionsWithThread = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        }
      }
    })
    console.log(`🧵 Sessões com threadId: ${sessionsWithThread}`)
    
    // Busca algumas sessões recentes
    const recentSessions = await prisma.chatSession.findMany({
      where: {
        threadId: {
          not: null
        }
      },
      select: {
        id: true,
        threadId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    })
    
    console.log(`\n📋 Últimas 3 sessões:`)
    recentSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ID: ${session.id}`)
      console.log(`      Thread: ${session.threadId}`)
      console.log(`      Data: ${session.createdAt}`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSessions()

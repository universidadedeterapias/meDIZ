// Script super simples para testar
console.log('🚀 Script iniciado!')

import { prisma } from '../lib/prisma'

async function superSimpleTest() {
  console.log('🔍 Testando conexão...')
  
  try {
    const count = await prisma.chatSession.count()
    console.log(`📊 Total de sessões: ${count}`)
    
    const sessionsWithThread = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        }
      }
    })
    console.log(`🧵 Sessões com threadId: ${sessionsWithThread}`)
    
    console.log('✅ Teste concluído!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Conexão fechada')
  }
}

superSimpleTest()

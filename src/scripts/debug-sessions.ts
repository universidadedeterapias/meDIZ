// Script de debug para verificar mensagens das sessões
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

async function debugSessions() {
  console.log('🔍 Debugando sessões para entender por que não há sintomas...')
  
  try {
    // Busca algumas sessões recentes
    const sessions = await prisma.chatSession.findMany({
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
      take: 5 // Apenas 5 para debug
    })

    console.log(`📈 Encontradas ${sessions.length} sessões para debug`)

    for (const session of sessions) {
      console.log(`\n🔍 Sessão ${session.id}:`)
      console.log(`   Thread ID: ${session.threadId}`)
      console.log(`   Data: ${session.createdAt}`)
      
      try {
        const messages = await getUserMessages(session.threadId!)
        console.log(`   Mensagens encontradas: ${messages?.length || 0}`)
        
        if (messages && messages.length > 0) {
          const firstMessage = messages[0]
          console.log(`   Primeira mensagem: "${firstMessage?.substring(0, 100)}..."`)
          console.log(`   Tipo: user message`)
        }
      } catch (error) {
        console.log(`   ❌ Erro ao buscar mensagens: ${error}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro no debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSessions()

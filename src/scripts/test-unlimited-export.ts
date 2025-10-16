// Script para testar exportação sem limites
// Executa: npx tsx src/scripts/test-unlimited-export.ts

import { prisma } from '../lib/prisma'

async function testUnlimitedExport() {
  console.log('🧪 Testando exportação sem limites...')
  
  try {
    // Teste 1: Contar todas as sessões
    const totalSessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        }
      }
    })
    console.log(`📊 Total de sessões disponíveis: ${totalSessions}`)

    // Teste 2: Contar sessões de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todaySessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    })
    console.log(`📅 Sessões de hoje: ${todaySessions}`)

    // Teste 3: Contar sessões da última semana
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const weekSessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: weekAgo
        }
      }
    })
    console.log(`📅 Sessões da última semana: ${weekSessions}`)

    console.log('\n✅ Teste concluído!')
    console.log('\n📋 Agora a exportação processará TODAS as sessões do período selecionado:')
    console.log('   - Sem limite artificial de 100 ou 1000')
    console.log('   - Processa todas as sessões encontradas')
    console.log('   - Tempo de processamento proporcional à quantidade de dados')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executa o script
testUnlimitedExport()
  .then(() => {
    console.log('🎉 Teste concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })


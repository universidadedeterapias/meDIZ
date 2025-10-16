// Script para testar filtros de período
// Executa: npx tsx src/scripts/test-period-filters.ts

import { prisma } from '../lib/prisma'

async function testPeriodFilters() {
  console.log('🧪 Testando filtros de período...')
  
  try {
    // Teste 1: Todos os dados
    const allSessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        }
      }
    })
    console.log(`📊 Total de sessões: ${allSessions}`)

    // Teste 2: Hoje
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

    // Teste 3: Últimos 7 dias
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
    console.log(`📅 Sessões dos últimos 7 dias: ${weekSessions}`)

    // Teste 4: Último mês
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    
    const monthSessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: monthAgo
        }
      }
    })
    console.log(`📅 Sessões do último mês: ${monthSessions}`)

    // Teste 5: Período personalizado (últimos 3 dias)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const customSessions = await prisma.chatSession.count({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: threeDaysAgo,
          lte: new Date()
        }
      }
    })
    console.log(`📅 Sessões dos últimos 3 dias: ${customSessions}`)

    console.log('\n✅ Testes de filtro concluídos!')
    console.log('\n📋 Resumo dos filtros disponíveis:')
    console.log('   - Todos os dados: Sem filtro de data')
    console.log('   - Hoje: Apenas sessões de hoje')
    console.log('   - Últimos 7 dias: Sessões da última semana')
    console.log('   - Último mês: Sessões do último mês')
    console.log('   - Período personalizado: Data inicial e final customizáveis')

  } catch (error) {
    console.error('❌ Erro durante os testes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executa o script
testPeriodFilters()
  .then(() => {
    console.log('🎉 Script de teste concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })


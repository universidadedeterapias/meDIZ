// src/scripts/test-user-periods.ts
import { PrismaClient } from '@prisma/client'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 TESTANDO REGRAS DE USO POR PERÍODO\n')

  // Datas de teste para simular diferentes períodos
  const testDates = [
    { name: 'Usuário Novo (1 dia)', days: 1 },
    { name: 'Usuário 3 dias', days: 3 },
    { name: 'Usuário 6 dias', days: 6 },
    { name: 'Usuário 7 dias (limite)', days: 7 },
    { name: 'Usuário 8 dias', days: 8 },
    { name: 'Usuário 15 dias', days: 15 },
    { name: 'Usuário 29 dias', days: 29 },
    { name: 'Usuário 30 dias (limite)', days: 30 },
    { name: 'Usuário 31 dias', days: 31 },
    { name: 'Usuário 60 dias', days: 60 },
    { name: 'Usuário 90 dias', days: 90 }
  ]

  console.log('📊 RESULTADOS DOS TESTES:\n')
  console.log('=' .repeat(80))
  
  testDates.forEach(({ name, days }) => {
    // Calcula a data de criação simulada
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - days)
    
    // Testa as regras
    const period = getUserPeriod(createdAt)
    const limits = getUserLimits(period)
    
    console.log(`\n${name}:`)
    console.log(`  📅 Data de criação: ${createdAt.toLocaleDateString('pt-BR')}`)
    console.log(`  📊 Período: ${period}`)
    console.log(`  🔍 Limite de pesquisas: ${limits.searchLimit}`)
    console.log(`  👁️  Visualização completa: ${limits.fullVisualization ? '✅ SIM' : '❌ NÃO'}`)
    console.log(`  🎯 Mostra popup: ${limits.fullVisualization ? '❌ NÃO' : '✅ SIM'}`)
  })

  console.log('\n' + '=' .repeat(80))
  console.log('\n📋 RESUMO DAS REGRAS:')
  console.log('• 0-7 dias: 3 pesquisas/dia, visualização completa')
  console.log('• 8-30 dias: 1 pesquisa/dia, conteúdo limitado')
  console.log('• 31+ dias: 1 pesquisa/dia, conteúdo limitado')
  console.log('\n🎯 POPUP: Aparece apenas para usuários SEM visualização completa')

  // Testa com usuários reais do banco
  console.log('\n\n🔍 TESTANDO COM USUÁRIOS REAIS DO BANCO:\n')
  
  try {
    const users = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })

    users.forEach((user, index) => {
      const period = getUserPeriod(user.createdAt)
      const limits = getUserLimits(period)
      
      console.log(`${index + 1}. ${user.name || 'Sem nome'} (${user.email})`)
      console.log(`   📅 Criado em: ${user.createdAt.toLocaleDateString('pt-BR')}`)
      console.log(`   📊 Período: ${period}`)
      console.log(`   🔍 Limite: ${limits.searchLimit} pesquisas/dia`)
      console.log(`   👁️  Visualização: ${limits.fullVisualization ? 'Completa' : 'Limitada'}`)
      console.log(`   🎯 Popup: ${limits.fullVisualization ? 'NÃO' : 'SIM'}`)
      console.log('')
    })

  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
  }

  await prisma.$disconnect()
}

main()

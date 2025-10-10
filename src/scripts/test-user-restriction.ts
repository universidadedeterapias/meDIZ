// src/scripts/test-user-restriction.ts
import { PrismaClient } from '@prisma/client'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 TESTANDO RESTRIÇÕES POR TEMPO DE CADASTRO\n')

  try {
    // Busca usuários para testar
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

    console.log('📊 TESTANDO USUÁRIOS REAIS:\n')

    users.forEach((user, index) => {
      const period = getUserPeriod(user.createdAt)
      const limits = getUserLimits(period)
      const daysSinceCreation = Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      console.log(`${index + 1}. ${user.name || 'Sem nome'} (${user.email})`)
      console.log(`   📅 Criado em: ${user.createdAt.toLocaleDateString('pt-BR')}`)
      console.log(`   📊 Dias desde criação: ${daysSinceCreation}`)
      console.log(`   📊 Período: ${period}`)
      console.log(`   🔍 Limite de pesquisas: ${limits.searchLimit}`)
      console.log(`   👁️  Visualização completa: ${limits.fullVisualization ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`   🎯 Deve mostrar popup: ${limits.fullVisualization ? '❌ NÃO' : '✅ SIM'}`)
      console.log('')
    })

    // Testa com datas específicas
    console.log('🧪 TESTANDO COM DATAS ESPECÍFICAS:\n')
    
    const testDates = [
      { name: 'Usuário de 1 dia', days: 1 },
      { name: 'Usuário de 5 dias', days: 5 },
      { name: 'Usuário de 7 dias (limite)', days: 7 },
      { name: 'Usuário de 8 dias', days: 8 },
      { name: 'Usuário de 15 dias', days: 15 },
      { name: 'Usuário de 30 dias (limite)', days: 30 },
      { name: 'Usuário de 31 dias', days: 31 },
      { name: 'Usuário de 60 dias', days: 60 }
    ]

    testDates.forEach(({ name, days }) => {
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - days)
      
      const period = getUserPeriod(createdAt)
      const limits = getUserLimits(period)
      
      console.log(`${name}:`)
      console.log(`  📅 Data de criação: ${createdAt.toLocaleDateString('pt-BR')}`)
      console.log(`  📊 Período: ${period}`)
      console.log(`  🔍 Limite: ${limits.searchLimit} pesquisas/dia`)
      console.log(`  👁️  Visualização: ${limits.fullVisualization ? 'Completa' : 'Limitada'}`)
      console.log(`  🎯 Popup: ${limits.fullVisualization ? 'NÃO' : 'SIM'}`)
      console.log('')
    })

    // Verifica se há usuários com subscription ativa
    console.log('🔍 VERIFICANDO SUBSCRIPTIONS ATIVAS:\n')
    
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: new Date()
        }
      },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true
          }
        }
      }
    })

    console.log(`📊 Usuários com subscription ativa: ${activeSubscriptions.length}\n`)

    activeSubscriptions.forEach((sub, index) => {
      const period = getUserPeriod(sub.user.createdAt)
      getUserLimits(period)
      
      console.log(`${index + 1}. ${sub.user.email}`)
      console.log(`   📅 Criado em: ${sub.user.createdAt.toLocaleDateString('pt-BR')}`)
      console.log(`   📊 Período: ${period}`)
      console.log(`   💳 Subscription: ATIVA`)
      console.log(`   🎯 Popup: NÃO (tem subscription)`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Erro ao testar restrições:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

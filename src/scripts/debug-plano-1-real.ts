// Script para debugar o problema do plano "1 real" aparecendo como dólar
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugPlano1Real() {
  try {
    console.log('🔍 Investigando problema do plano "1 real" aparecendo como dólar...\n')

    // Buscar plano "1 real" pelo offerKey (sem usar hotmartId)
    const plano1Real = await prisma.plan.findFirst({
      where: { 
        OR: [
          { hotmartOfferKey: 'b24v0i4q' },
          { stripePriceId: 'b24v0i4q' }
        ]
      }
    })

    if (!plano1Real) {
      console.log('❌ Plano "1 real" (b24v0i4q) não encontrado no banco!')
      return
    }

    console.log('📋 Plano "1 real" encontrado:')
    console.log('   ID:', plano1Real.id)
    console.log('   Nome:', plano1Real.name)
    console.log('   Currency:', plano1Real.currency || 'NÃO DEFINIDA')
    console.log('   hotmartId:', plano1Real.hotmartId || 'NÃO DEFINIDO')
    console.log('   hotmartOfferKey:', plano1Real.hotmartOfferKey)
    console.log('   Interval:', plano1Real.interval)
    console.log('   Amount:', plano1Real.amount)
    console.log('')

    // Verificar se há planos USD que podem estar sendo selecionados incorretamente
    const planosUSD = await prisma.plan.findMany({
      where: {
        currency: 'USD',
        active: true
      }
    })

    console.log('💵 Planos em USD encontrados:', planosUSD.length)
    planosUSD.forEach(p => {
      console.log(`   - ${p.name} (${p.hotmartOfferKey || p.stripePriceId})`)
      console.log(`     hotmartId: ${p.hotmartId || 'NÃO DEFINIDO'}`)
      console.log(`     Interval: ${p.interval}`)
    })
    console.log('')

    // Verificar assinaturas recentes do plano "1 real"
    const assinaturas1Real = await prisma.subscription.findMany({
      where: {
        planId: plano1Real.id
      },
      include: {
        plan: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log('📊 Últimas 10 assinaturas do plano "1 real":')
    assinaturas1Real.forEach(sub => {
      console.log(`   - ${sub.user.email} (${sub.user.name || 'Sem nome'})`)
      console.log(`     Status: ${sub.status}`)
      console.log(`     Plano: ${sub.plan.name}`)
      console.log(`     Currency do plano: ${sub.plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`     Criada em: ${sub.createdAt.toISOString()}`)
      console.log('')
    })

    // Verificar se há planos mensais em BRL que podem estar sendo confundidos
    const planosMensaisBRL = await prisma.plan.findMany({
      where: {
        interval: 'MONTH',
        currency: 'BRL',
        active: true
      }
    })

    console.log('📋 Planos mensais em BRL:')
    planosMensaisBRL.forEach(p => {
      console.log(`   - ${p.name}`)
      console.log(`     hotmartId: ${p.hotmartId || 'NÃO DEFINIDO'}`)
      console.log(`     hotmartOfferKey: ${p.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log(`     stripePriceId: ${p.stripePriceId}`)
      console.log('')
    })

    console.log('✅ Diagnóstico concluído!')

  } catch (error) {
    console.error('❌ Erro ao investigar:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  debugPlano1Real()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { debugPlano1Real }


// src/scripts/check-plan-1115304.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Verificando plano hotmartId 1115304...\n')
    
    const plan = await prisma.plan.findUnique({
      where: { hotmartId: 1115304 }
    })
    
    if (plan) {
      console.log('✅ Plano encontrado:')
      console.log(`   ID: ${plan.id}`)
      console.log(`   Nome: ${plan.name}`)
      console.log(`   hotmartId: ${plan.hotmartId}`)
      console.log(`   hotmartOfferKey: ${plan.hotmartOfferKey}`)
      console.log(`   stripePriceId: ${plan.stripePriceId}`)
      console.log(`   Moeda: ${plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`   Intervalo: ${plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`   Valor: ${plan.amount ? `${plan.currency || 'BRL'} ${(plan.amount / 100).toFixed(2)}` : 'NÃO DEFINIDO'}`)
      console.log(`   Ativo: ${plan.active ? '✅' : '❌'}`)
    } else {
      console.log('❌ Plano com hotmartId 1115304 NÃO encontrado no banco!')
      console.log('\n🔍 Verificando planos similares...')
      
      const similarPlans = await prisma.plan.findMany({
        where: {
          OR: [
            { name: { contains: 'Profissional' } },
            { name: { contains: 'Mensal' } }
          ]
        }
      })
      
      console.log(`\n📊 Encontrados ${similarPlans.length} planos similares:`)
      similarPlans.forEach(p => {
        console.log(`   - ${p.name}`)
        console.log(`     hotmartId: ${p.hotmartId || 'NÃO DEFINIDO'}`)
        console.log(`     Moeda: ${p.currency || 'NÃO DEFINIDA'}`)
        console.log(`     Intervalo: ${p.interval || 'NÃO DEFINIDO'}`)
        console.log('')
      })
    }
    
    // Verificar também pelo offerCode "7rzjhiml"
    console.log('\n🔍 Verificando plano com offerCode "7rzjhiml"...')
    const planByOffer = await prisma.plan.findUnique({
      where: { hotmartOfferKey: '7rzjhiml' }
    })
    
    if (planByOffer) {
      console.log('✅ Plano encontrado por offerCode:')
      console.log(`   Nome: ${planByOffer.name}`)
      console.log(`   Moeda: ${planByOffer.currency || 'NÃO DEFINIDA'}`)
      console.log(`   hotmartId: ${planByOffer.hotmartId || 'NÃO DEFINIDO'}`)
    } else {
      console.log('❌ Plano com offerCode "7rzjhiml" NÃO encontrado no banco!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))


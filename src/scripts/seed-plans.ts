// src/scripts/seed-plans.ts
import { PrismaClient, PlanInterval } from '@prisma/client'

const prisma = new PrismaClient()

async function seedPlans() {
  try {
    console.log('🌱 Iniciando seed de planos...')

    // Verificar se já existem planos
    const existingPlans = await prisma.plan.count()
    if (existingPlans > 0) {
      console.log(`✅ Já existem ${existingPlans} planos no banco. Pulando seed.`)
      return
    }

    // Criar planos de exemplo
    const plans = [
      {
        name: 'Plano Básico',
        stripePriceId: 'price_basico_monthly',
        stripeProductId: 'prod_basico',
        amount: 2990, // R$ 29.90 em centavos
        currency: 'brl',
        interval: PlanInterval.MONTH,
        intervalCount: 1,
        active: true,
        monthlyLimit: 100
      },
      {
        name: 'Plano Premium',
        stripePriceId: 'price_premium_monthly',
        stripeProductId: 'prod_premium',
        amount: 4990, // R$ 49.90 em centavos
        currency: 'brl',
        interval: PlanInterval.MONTH,
        intervalCount: 1,
        active: true,
        monthlyLimit: 500
      },
      {
        name: 'Plano Anual',
        stripePriceId: 'price_anual_yearly',
        stripeProductId: 'prod_anual',
        amount: 29990, // R$ 299.90 em centavos
        currency: 'brl',
        interval: PlanInterval.YEAR,
        intervalCount: 1,
        active: true,
        monthlyLimit: 1000
      }
    ]

    for (const plan of plans) {
      await prisma.plan.create({
        data: plan
      })
      console.log(`✅ Plano criado: ${plan.name}`)
    }

    console.log('🎉 Seed de planos concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao fazer seed de planos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedPlans()
    .then(() => {
      console.log('✅ Script concluído')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default seedPlans

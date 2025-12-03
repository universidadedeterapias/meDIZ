// src/scripts/check-user-soarist.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const email = 'soarist@hotmail.com'
    console.log(`🔍 Verificando usuário: ${email}\n`)
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                stripePriceId: true,
                hotmartOfferKey: true,
                currency: true,
                interval: true,
                amount: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!user) {
      console.log('❌ Usuário não encontrado')
      return
    }
    
    console.log(`✅ Usuário encontrado: ${user.name || user.email}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Total de assinaturas: ${user.subscriptions.length}\n`)
    
    user.subscriptions.forEach((sub, index) => {
      console.log(`📋 Assinatura ${index + 1}:`)
      console.log(`   ID: ${sub.id}`)
      console.log(`   stripeSubscriptionId: ${sub.stripeSubscriptionId}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   Período: ${sub.currentPeriodStart.toISOString()} até ${sub.currentPeriodEnd.toISOString()}`)
      console.log(`   Criada em: ${sub.createdAt.toISOString()}`)
      console.log(`   Plano:`)
      console.log(`      Nome: ${sub.plan.name}`)
      console.log(`      stripePriceId: ${sub.plan.stripePriceId}`)
      console.log(`      hotmartOfferKey: ${sub.plan.hotmartOfferKey || 'NÃO DEFINIDO'}`)
      console.log(`      Moeda: ${sub.plan.currency || 'NÃO DEFINIDA'}`)
      console.log(`      Intervalo: ${sub.plan.interval || 'NÃO DEFINIDO'}`)
      console.log(`      Valor: ${sub.plan.amount ? `${sub.plan.currency || 'BRL'} ${(sub.plan.amount / 100).toFixed(2)}` : 'NÃO DEFINIDO'}`)
      console.log('')
    })
    
    // Verificar se há assinatura ativa
    const activeSub = user.subscriptions.find(sub => 
      ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
      sub.currentPeriodEnd >= new Date()
    )
    
    if (activeSub) {
      console.log(`✅ Assinatura ATIVA:`)
      console.log(`   Plano: ${activeSub.plan.name}`)
      console.log(`   Moeda: ${activeSub.plan.currency || 'NÃO DEFINIDA'}`)
      
      // Verificar se o plano está correto
      if (activeSub.plan.currency === 'USD') {
        console.log(`\n🚨 PROBLEMA: Usuário tem plano em USD mas deveria ser BRL!`)
        console.log(`   OfferKey atual: ${activeSub.plan.hotmartOfferKey || activeSub.plan.stripePriceId}`)
        
        // Tentar encontrar plano BRL correto
        const brlPlans = await prisma.plan.findMany({
          where: {
            currency: 'BRL',
            interval: activeSub.plan.interval || 'MONTH',
            active: true
          }
        })
        
        console.log(`\n💡 Planos BRL disponíveis no mesmo intervalo:`)
        brlPlans.forEach(p => {
          console.log(`   - ${p.name} (${p.hotmartOfferKey || p.stripePriceId})`)
        })
      }
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


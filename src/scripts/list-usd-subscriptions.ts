// src/scripts/list-usd-subscriptions.ts
// Lista assinaturas com planos USD para análise
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🔍 Listando assinaturas Hotmart com planos USD...\n')
    
    const usdSubscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: {
          startsWith: 'hotmart_'
        },
        plan: {
          currency: 'USD'
        }
      },
      include: {
        plan: {
          select: {
            name: true,
            stripePriceId: true,
            hotmartOfferKey: true,
            currency: true,
            interval: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total: ${usdSubscriptions.length} assinaturas com planos USD\n`)
    
    // Planos USD conhecidos
    const knownUsdPlans = ['qhs594oc', 'i7m8kqyw']
    
    const suspicious: Array<{ email: string; offerKey: string; planName: string }> = []
    
    usdSubscriptions.forEach((sub, index) => {
      const offerKey = sub.plan.hotmartOfferKey || sub.plan.stripePriceId
      const isKnownUsd = knownUsdPlans.includes(offerKey)
      
      console.log(`${index + 1}. ${sub.user.email}`)
      console.log(`   Plano: ${sub.plan.name}`)
      console.log(`   OfferKey: ${offerKey}`)
      console.log(`   Moeda: ${sub.plan.currency}`)
      console.log(`   Intervalo: ${sub.plan.interval}`)
      console.log(`   É plano USD conhecido? ${isKnownUsd ? '✅ SIM' : '❌ NÃO (suspeito!)'}`)
      
      if (!isKnownUsd) {
        suspicious.push({
          email: sub.user.email,
          offerKey: offerKey,
          planName: sub.plan.name
        })
      }
      console.log('')
    })
    
    if (suspicious.length > 0) {
      console.log(`\n🚨 ${suspicious.length} assinatura(s) SUSPEITA(S) (não são planos USD conhecidos):`)
      suspicious.forEach(s => {
        console.log(`   - ${s.email}: ${s.planName} (${s.offerKey})`)
      })
      console.log('\n💡 Essas provavelmente deveriam ser BRL!')
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


// src/scripts/test-count-premium.ts
import { prisma } from '@/lib/prisma'
import { countPremiumUsers } from '@/lib/premiumUtils'

async function testCountPremium() {
  console.log('🧪 TESTANDO CONTAGEM DE USUÁRIOS PREMIUM')
  console.log('=' .repeat(50))
  
  try {
    // Teste 1: Usar função countPremiumUsers
    const count1 = await countPremiumUsers()
    console.log(`\n1. countPremiumUsers(): ${count1}`)
    
    // Teste 2: Query direta idêntica
    const count2 = await prisma.user.count({
      where: {
        subscriptions: {
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      }
    })
    console.log(`2. Query direta: ${count2}`)
    
    // Teste 3: Contar subscriptions ativas primeiro
    const activeSubs = await prisma.subscription.count({
      where: {
        status: {
          in: ['active', 'ACTIVE', 'cancel_at_period_end']
        },
        currentPeriodEnd: {
          gte: new Date()
        }
      }
    })
    console.log(`3. Total subscriptions ativas: ${activeSubs}`)
    
    // Teste 4: Buscar usuários únicos com subscription ativa
    const uniqueUsers = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        fullName: true
      }
    })
    console.log(`4. Usuários únicos com subscription ativa: ${uniqueUsers.length}`)
    
    // Mostrar lista de usuários premium
    console.log('\n📋 LISTA DE USUÁRIOS PREMIUM:')
    uniqueUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name || user.fullName || 'Sem nome'})`)
    })
    
    // Teste 5: Verificar se há usuários com múltiplas subscriptions
    const usersWithMultipleSubs = await prisma.user.findMany({
      where: {
        subscriptions: {
          some: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      },
      include: {
        subscriptions: {
          where: {
            status: {
              in: ['active', 'ACTIVE', 'cancel_at_period_end']
            },
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        }
      }
    })
    
    const multipleSubsUsers = usersWithMultipleSubs.filter(user => user.subscriptions.length > 1)
    console.log(`\n🔄 Usuários com múltiplas subscriptions ativas: ${multipleSubsUsers.length}`)
    
    if (multipleSubsUsers.length > 0) {
      multipleSubsUsers.forEach(user => {
        console.log(`- ${user.email}: ${user.subscriptions.length} subscriptions`)
        user.subscriptions.forEach(sub => {
          console.log(`  * ${sub.status} (até ${sub.currentPeriodEnd.toISOString()})`)
        })
      })
    }
    
    // Teste 6: Verificar discrepância
    console.log(`\n📊 RESUMO:`)
    console.log(`- Subscriptions ativas: ${activeSubs}`)
    console.log(`- Usuários únicos premium: ${uniqueUsers.length}`)
    console.log(`- Diferença: ${activeSubs - uniqueUsers.length}`)
    
    if (activeSubs !== uniqueUsers.length) {
      console.log(`\n⚠️  DISCREPÂNCIA DETECTADA!`)
      console.log(`Há ${activeSubs - uniqueUsers.length} subscriptions extras`)
      console.log(`Isso indica usuários com múltiplas subscriptions ativas`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCountPremium()

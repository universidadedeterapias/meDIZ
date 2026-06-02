// src/scripts/check-subscriptions.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verificando subscriptions no banco de dados...')

  try {
    // Conta total de usuários
    const totalUsers = await prisma.user.count()
    console.log(`Total de usuários: ${totalUsers}`)

    // Conta total de subscriptions
    const totalSubscriptions = await prisma.subscription.count()
    console.log(`Total de subscriptions: ${totalSubscriptions}`)

    // Lista todas as subscriptions
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        plan: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('\n=== SUBSCRIPTIONS ENCONTRADAS ===')
    if (subscriptions.length === 0) {
      console.log('❌ Nenhuma subscription encontrada no banco!')
      console.log('Isso significa que TODOS os usuários são considerados do plano gratuito.')
    } else {
      subscriptions.forEach((sub, index) => {
        console.log(`\n${index + 1}. Subscription ID: ${sub.id}`)
        console.log(`   Usuário: ${sub.user.name} (${sub.user.email})`)
        console.log(`   Plano: ${sub.plan.name}`)
        console.log(`   Status: ${sub.status}`)
        console.log(`   Período: ${sub.currentPeriodStart.toLocaleDateString()} - ${sub.currentPeriodEnd.toLocaleDateString()}`)
        console.log(`   Ativa: ${sub.currentPeriodEnd > new Date() ? '✅ SIM' : '❌ NÃO'}`)
      })
    }

    // Verifica subscriptions ativas
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
            email: true
          }
        }
      }
    })

    console.log(`\n=== SUBSCRIPTIONS ATIVAS: ${activeSubscriptions.length} ===`)
    activeSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.user.email} - Status: ${sub.status}`)
    })

  } catch (error) {
    console.error('Erro ao verificar subscriptions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

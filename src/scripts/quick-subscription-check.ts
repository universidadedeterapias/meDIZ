// src/scripts/quick-subscription-check.ts
import { prisma } from '@/lib/prisma'

async function quickCheck() {
  console.log('🔍 VERIFICAÇÃO RÁPIDA DE SUBSCRIPTIONS')
  
  try {
    // Contar subscriptions ativas
    const activeCount = await prisma.subscription.count({
      where: {
        status: { in: ['active', 'ACTIVE', 'cancel_at_period_end'] },
        currentPeriodEnd: { gte: new Date() }
      }
    })
    
    // Contar usuários únicos com subscription ativa
    const uniqueUsers = await prisma.user.count({
      where: {
        subscriptions: {
          some: {
            status: { in: ['active', 'ACTIVE', 'cancel_at_period_end'] },
            currentPeriodEnd: { gte: new Date() }
          }
        }
      }
    })
    
    // Buscar subscriptions de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todaySubs = await prisma.subscription.findMany({
      where: { createdAt: { gte: today } },
      include: {
        user: { select: { email: true, name: true, fullName: true } },
        plan: { select: { name: true } }
      }
    })
    
    // Buscar por "jairo" e "jannaina"
    const jairoUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'jairo', mode: 'insensitive' } },
          { fullName: { contains: 'jairo', mode: 'insensitive' } },
          { email: { contains: 'jairo', mode: 'insensitive' } }
        ]
      },
      include: {
        subscriptions: {
          include: { plan: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    const jannainaUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'jannaina', mode: 'insensitive' } },
          { fullName: { contains: 'jannaina', mode: 'insensitive' } },
          { email: { contains: 'jannaina', mode: 'insensitive' } }
        ]
      },
      include: {
        subscriptions: {
          include: { plan: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    console.log(`\n📊 Subscriptions ativas: ${activeCount}`)
    console.log(`👥 Usuários únicos premium: ${uniqueUsers}`)
    console.log(`📅 Subscriptions hoje: ${todaySubs.length}`)
    
    if (todaySubs.length > 0) {
      console.log('\n📋 Subscriptions de hoje:')
      todaySubs.forEach(sub => {
        console.log(`- ${sub.user.email} (${sub.user.name || sub.user.fullName}) - ${sub.plan.name}`)
      })
    }
    
    console.log(`\n👤 Usuários "jairo": ${jairoUsers.length}`)
    jairoUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name || user.fullName}) - ${user.subscriptions.length} subs`)
    })
    
    console.log(`\n👤 Usuários "jannaina": ${jannainaUsers.length}`)
    jannainaUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name || user.fullName}) - ${user.subscriptions.length} subs`)
    })
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

quickCheck()

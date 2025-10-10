// src/scripts/find-specific-users.ts
import { prisma } from '@/lib/prisma'

async function findSpecificUsers() {
  console.log('🔍 BUSCANDO USUÁRIOS ESPECÍFICOS')
  console.log('=' .repeat(50))
  
  try {
    // Buscar por "jairo" (case insensitive)
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
          include: {
            plan: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // Buscar por "wilson" (case insensitive)
    const wilsonUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'wilson', mode: 'insensitive' } },
          { fullName: { contains: 'wilson', mode: 'insensitive' } },
          { email: { contains: 'wilson', mode: 'insensitive' } }
        ]
      },
      include: {
        subscriptions: {
          include: {
            plan: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // Buscar por "jannaina" (case insensitive)
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
          include: {
            plan: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // Buscar por "pinho" (case insensitive)
    const pinhoUsers = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'pinho', mode: 'insensitive' } },
          { fullName: { contains: 'pinho', mode: 'insensitive' } },
          { email: { contains: 'pinho', mode: 'insensitive' } }
        ]
      },
      include: {
        subscriptions: {
          include: {
            plan: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    // Buscar subscriptions criadas hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todaySubscriptions = await prisma.subscription.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            fullName: true
          }
        },
        plan: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n👤 Usuários com "jairo": ${jairoUsers.length}`)
    jairoUsers.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })
    
    console.log(`\n👤 Usuários com "wilson": ${wilsonUsers.length}`)
    wilsonUsers.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })
    
    console.log(`\n👤 Usuários com "jannaina": ${jannainaUsers.length}`)
    jannainaUsers.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })
    
    console.log(`\n👤 Usuários com "pinho": ${pinhoUsers.length}`)
    pinhoUsers.forEach(user => {
      console.log(`\n- Email: ${user.email}`)
      console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
      console.log(`  Criado em: ${user.createdAt.toISOString()}`)
      console.log(`  Subscriptions: ${user.subscriptions.length}`)
      user.subscriptions.forEach(sub => {
        console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
      })
    })
    
    console.log(`\n📅 Subscriptions criadas hoje: ${todaySubscriptions.length}`)
    if (todaySubscriptions.length > 0) {
      console.log('\n📋 Detalhes das subscriptions de hoje:')
      todaySubscriptions.forEach(sub => {
        console.log(`\n- Subscription ID: ${sub.id}`)
        console.log(`  Usuário: ${sub.user.email}`)
        console.log(`  Nome: ${sub.user.name || sub.user.fullName || 'Sem nome'}`)
        console.log(`  Plano: ${sub.plan.name}`)
        console.log(`  Status: ${sub.status}`)
        console.log(`  Criado em: ${sub.createdAt.toISOString()}`)
        console.log(`  Período: ${sub.currentPeriodStart.toISOString()} até ${sub.currentPeriodEnd.toISOString()}`)
      })
    }
    
    // Buscar usuários criados hoje
    const todayUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: today }
      },
      include: {
        subscriptions: {
          include: {
            plan: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n👥 Usuários criados hoje: ${todayUsers.length}`)
    if (todayUsers.length > 0) {
      console.log('\n📋 Detalhes dos usuários de hoje:')
      todayUsers.forEach(user => {
        console.log(`\n- Email: ${user.email}`)
        console.log(`  Nome: ${user.name || user.fullName || 'Sem nome'}`)
        console.log(`  Criado em: ${user.createdAt.toISOString()}`)
        console.log(`  Subscriptions: ${user.subscriptions.length}`)
        user.subscriptions.forEach(sub => {
          console.log(`    * ${sub.plan.name} - ${sub.status} (${sub.createdAt.toISOString()})`)
        })
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findSpecificUsers()

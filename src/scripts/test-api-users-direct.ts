// src/scripts/test-api-users-direct.ts
import { prisma } from '@/lib/prisma'

async function testApiUsersDirect() {
  console.log('🧪 TESTANDO QUERY DA API DE USUÁRIOS')
  console.log('=' .repeat(50))
  
  try {
    // Simular a query exata da API
    const page = 1
    const limit = 50
    const search = ''
    const planFilter: 'all' | 'free' | 'premium' = 'all'
    const roleFilter: 'all' | 'admin' | 'user' = 'all'
    
    const skip = (page - 1) * limit
    
    // Query base para usuários (igual à API)
    const whereClause: Record<string, unknown> = {}
    
    // Filtro de busca
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Filtro por role (admin)
    if (roleFilter === 'admin') {
      whereClause.email = { contains: '@mediz.com' }
    } else if (roleFilter === 'user') {
      whereClause.NOT = {
        email: { contains: '@mediz.com' }
      }
    }
    
    // Busca usuários com suas subscriptions (igual à API)
    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        accounts: {
          select: {
            provider: true,
            providerAccountId: true
          }
        },
        sessions: {
          select: {
            expires: true
          },
          orderBy: {
            expires: 'desc'
          },
          take: 1
        },
        chatSessions: {
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })
    
    // Conta total para paginação
    const totalUsers = await prisma.user.count({ where: whereClause })
    
    console.log(`\n📊 Total de usuários encontrados: ${totalUsers}`)
    console.log(`📋 Usuários retornados nesta página: ${users.length}`)
    
    // Processar os dados dos usuários (igual à API)
    const processedUsers = await Promise.all(users.map(async user => {
      // Determina se tem subscription ativa usando fonte de verdade
      const activeSubscription = user.subscriptions.find(sub => 
        ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
        sub.currentPeriodEnd >= new Date()
      )
      
      // Determina o plano baseado na fonte de verdade
      const plan = activeSubscription ? 'premium' : 'free'
      
      // Determina se é admin
      const isAdmin = user.email.includes('@mediz.com')
      
      // Conta pesquisas (chat sessions)
      const totalSearches = user.chatSessions.length
      
      // Último login (baseado na sessão mais recente)
      const lastLogin = user.sessions[0]?.expires || null
      
      return {
        id: user.id,
        name: user.name || user.fullName || 'Sem nome',
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        isAdmin,
        plan,
        lastLogin: lastLogin?.toISOString() || null,
        totalSearches,
        hasActiveSubscription: !!activeSubscription,
        subscriptionDetails: activeSubscription ? {
          id: activeSubscription.id,
          planName: activeSubscription.plan.name,
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
          currentPeriodStart: activeSubscription.currentPeriodStart.toISOString()
        } : null,
        totalSubscriptions: user.subscriptions.length,
        providers: user.accounts.map(acc => acc.provider)
      }
    }))
    
    // Filtra por plano se especificado
    let filteredUsers = processedUsers
    if (planFilter !== 'all') {
      filteredUsers = processedUsers.filter(user => user.plan === planFilter)
    }
    
    console.log(`\n💳 Usuários premium na lista: ${filteredUsers.filter(u => u.plan === 'premium').length}`)
    console.log(`🆓 Usuários gratuitos na lista: ${filteredUsers.filter(u => u.plan === 'free').length}`)
    
    // Mostrar usuários premium
    const premiumUsers = filteredUsers.filter(u => u.plan === 'premium')
    console.log(`\n📋 LISTA DE USUÁRIOS PREMIUM NA API:`)
    premiumUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.name})`)
      if (user.subscriptionDetails) {
        console.log(`   Plano: ${user.subscriptionDetails.planName}`)
        console.log(`   Status: ${user.subscriptionDetails.status}`)
        console.log(`   Vence em: ${user.subscriptionDetails.currentPeriodEnd}`)
      }
    })
    
    // Verificar se há usuários que deveriam estar na lista mas não estão
    console.log(`\n🔍 VERIFICANDO USUÁRIOS ESPECÍFICOS:`)
    
    // Buscar usuários premium que não estão na lista
    const allPremiumUsers = await prisma.user.findMany({
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
    
    const apiUserIds = new Set(filteredUsers.map(u => u.id))
    const missingUsers = allPremiumUsers.filter(user => !apiUserIds.has(user.id))
    
    console.log(`\n⚠️  Usuários premium que não aparecem na API: ${missingUsers.length}`)
    if (missingUsers.length > 0) {
      missingUsers.forEach(user => {
        console.log(`- ${user.email} (${user.name || user.fullName || 'Sem nome'})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testApiUsersDirect()

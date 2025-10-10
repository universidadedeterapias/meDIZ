// src/app/api/admin/users/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'
import { countPremiumUsers } from '@/lib/premiumUtils'
import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const planFilter = searchParams.get('plan') || 'all'
    const roleFilter = searchParams.get('role') || 'all'

    const skip = (page - 1) * limit

    // Query base para usuários
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

    // Busca usuários com suas subscriptions
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

    // Processa os dados dos usuários
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

      // Período do usuário (para usuários gratuitos)
      const userPeriod = getUserPeriod(user.createdAt)
      const { searchLimit, fullVisualization } = getUserLimits(userPeriod)

      return {
        id: user.id,
        name: user.name || user.fullName || 'Sem nome',
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        isAdmin,
        plan,
        lastLogin: lastLogin?.toISOString() || null,
        totalSearches,
        userPeriod,
        searchLimit,
        fullVisualization,
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

    // Estatísticas gerais usando fonte de verdade
    const premiumUsersCount = await countPremiumUsers()
    
    // Usuários ativos nos últimos 7 dias (baseado em ChatSession real)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const activeUsersCount = await prisma.user.count({
      where: {
        chatSessions: {
          some: {
            createdAt: {
              gte: sevenDaysAgo
            }
          }
        }
      }
    })
    
    const stats = {
      totalUsers,
      premiumUsers: premiumUsersCount,
      freeUsers: totalUsers - premiumUsersCount,
      adminUsers: processedUsers.filter(u => u.isAdmin).length,
      activeUsers: activeUsersCount
    }

    return NextResponse.json({
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário
export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email já está em uso' }, { status: 400 })
    }

    // Hash da senha
    const passwordHash = await hash(password, 10)

    // Criar usuário
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        emailVerified: new Date(), // Marcar como verificado
        fullName: name
      }
    })

    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      createdAt: newUser.createdAt.toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

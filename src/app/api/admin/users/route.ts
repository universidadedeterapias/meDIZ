// src/app/api/admin/users/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'
import { countPremiumUsers } from '@/lib/premiumUtils'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { logUserAction, AuditActions } from '@/lib/auditLogger'

/**
 * Retorna o nome correto do plano baseado no stripePriceId
 * Normaliza nomes antigos para os nomes corretos
 */
function getCorrectPlanName(stripePriceId: string, interval: string | null, currentName?: string): string {
  // Se já tem o nome correto, retornar
  if (currentName === 'Assinatura mensal hotmart' || currentName === 'Assinatura anual hotmart') {
    return currentName
  }
  
  // Mapear códigos conhecidos para nomes corretos
  if (stripePriceId === 'price_hotmart_mensal' || 
      stripePriceId === 'price_1RcsjzA' || 
      stripePriceId.includes('mensal') ||
      (interval === 'MONTH' && stripePriceId.includes('hotmart'))) {
    return 'Assinatura mensal hotmart'
  }
  
  if (stripePriceId === 'price_hotmart_anual' || 
      stripePriceId === 'price_1Rd9st' || 
      stripePriceId.includes('anual') ||
      (interval === 'YEAR' && stripePriceId.includes('hotmart'))) {
    return 'Assinatura anual hotmart'
  }
  
  // Para outros planos, retornar o nome original (caso existam outros tipos)
  // Mas isso não deve acontecer com os 2 planos válidos
  return currentName || stripePriceId
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const planFilter: 'all' | 'free' | 'premium' = (searchParams.get('plan') as 'all' | 'free' | 'premium') || 'all'
    const roleFilter: 'all' | 'admin' | 'user' = (searchParams.get('role') as 'all' | 'admin' | 'user') || 'all'
    const subscriptionDateStart = searchParams.get('subscriptionDateStart') || null
    const subscriptionDateEnd = searchParams.get('subscriptionDateEnd') || null

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

    // 🔍 DEBUG: Log dos filtros recebidos
    console.log('[ADMIN USERS API] 🔍 Filtros recebidos:', {
      search,
      planFilter,
      roleFilter,
      subscriptionDateStart,
      subscriptionDateEnd,
      page,
      limit
    })

    // Filtro por data de criação de assinatura (ativa OU expirada)
    // ⚠️ CORREÇÃO: Incluir assinaturas expiradas para não excluir usuários da busca
    if (subscriptionDateStart || subscriptionDateEnd) {
      const subscriptionFilter: Record<string, unknown> = {
        // Incluir TODOS os status possíveis (não apenas ativos)
        // Isso permite encontrar usuários mesmo que suas assinaturas tenham expirado
        // Removemos o filtro de status para incluir expired, canceled, etc
      }

      // Filtro por data de criação (createdAt da Subscription)
      if (subscriptionDateStart) {
        const startDate = new Date(subscriptionDateStart)
        startDate.setHours(0, 0, 0, 0)
        subscriptionFilter.createdAt = { gte: startDate }
      }

      if (subscriptionDateEnd) {
        const endDate = new Date(subscriptionDateEnd)
        endDate.setHours(23, 59, 59, 999)
        if (subscriptionFilter.createdAt) {
          subscriptionFilter.createdAt = {
            ...(subscriptionFilter.createdAt as Record<string, unknown>),
            lte: endDate
          }
        } else {
          subscriptionFilter.createdAt = { lte: endDate }
        }
      }

      whereClause.subscriptions = {
        some: subscriptionFilter
      }

      console.log('[ADMIN USERS API] 🔍 Filtro de assinatura aplicado:', JSON.stringify(subscriptionFilter, null, 2))
    }

    // Busca todos os usuários ordenados por data de criação (mais recentes primeiro)
    const allUsers = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          include: {
            plan: {
              select: {
                name: true,
                interval: true,
                intervalCount: true,
                stripePriceId: true
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

    // Aplica paginação após ordenação
    const users = allUsers.slice(skip, skip + limit)

    // Conta total para paginação
    const totalUsers = await prisma.user.count({ where: whereClause })

    // 🔍 DEBUG: Log da busca
    console.log('[ADMIN USERS API] 🔍 Usuários encontrados na query:', allUsers.length)
    console.log('[ADMIN USERS API] 🔍 Usuários após paginação:', users.length)

    // Processa os dados dos usuários
    const processedUsers = await Promise.all(users.map(async user => {
      // 🔍 DEBUG: Log de cada usuário processado
      console.log(`[ADMIN USERS API] 🔍 Processando usuário: ${user.email}`, {
        totalSubscriptions: user.subscriptions.length,
        subscriptions: user.subscriptions.map(sub => ({
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          isExpired: sub.currentPeriodEnd < new Date()
        }))
      })

      // Determina se tem subscription ativa usando fonte de verdade
      const activeSubscription = user.subscriptions.find(sub => 
        ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
        sub.currentPeriodEnd >= new Date()
      )

      // 🔍 DEBUG: Verificar se há assinaturas expiradas
      const expiredSubscriptions = user.subscriptions.filter(sub => 
        sub.currentPeriodEnd < new Date() && 
        ['active', 'ACTIVE', 'expired'].includes(sub.status)
      )
      
      if (expiredSubscriptions.length > 0) {
        console.log(`[ADMIN USERS API] ⚠️ Usuário ${user.email} tem ${expiredSubscriptions.length} assinatura(s) expirada(s)`)
      }

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
          planName: getCorrectPlanName(activeSubscription.plan.stripePriceId, activeSubscription.plan.interval, activeSubscription.plan.name),
          planInterval: activeSubscription.plan.interval, // Adicionar intervalo do plano
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
          currentPeriodStart: activeSubscription.currentPeriodStart.toISOString()
        } : null,
        // 🔍 DEBUG: Adicionar informações sobre assinaturas expiradas
        expiredSubscriptions: expiredSubscriptions.length > 0 ? expiredSubscriptions.map(sub => ({
          id: sub.id,
          planName: getCorrectPlanName(sub.plan.stripePriceId, sub.plan.interval, sub.plan.name),
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          currentPeriodStart: sub.currentPeriodStart.toISOString()
        })) : [],
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
    
    // Contar usuários admin de todos os usuários, não apenas da página atual
    const adminUsersCount = await prisma.user.count({
      where: {
        ...whereClause,
        email: {
          contains: '@mediz.com'
        }
      }
    })
    
    const stats = {
      totalUsers,
      premiumUsers: premiumUsersCount,
      freeUsers: totalUsers - premiumUsersCount,
      adminUsers: adminUsersCount,
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

    // Registrar criação no audit log
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (admin) {
      await logUserAction(
        admin.id,
        session.user.email,
        AuditActions.USER_CREATE,
        newUser.id,
        {
          userName: newUser.name,
          userEmail: newUser.email,
          createdBy: session.user.email
        },
        req as NextRequest
      )
    }

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

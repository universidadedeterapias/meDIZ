// src/app/api/admin/users/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getUserPeriod, getUserLimits } from '@/lib/userPeriod'
import { countPremiumUsers } from '@/lib/premiumUtils'
import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { logUserAction, AuditActions } from '@/lib/auditLogger'

/**
 * Retorna o nome do plano para exibição
 * REGRA: SEMPRE usar o nome do banco de dados quando disponível
 * - Para planos Hotmart: O nome do banco foi atualizado pelo webhook da Hotmart
 * - Para planos Stripe: Usar o nome do banco ou fallback genérico
 */
function getCorrectPlanName(
  stripePriceId: string, 
  interval: string | null, 
  currentName?: string,
  hotmartId?: number | null,
  _currency?: string | null
): string {
  // ⚠️ REGRA PRINCIPAL: Se tem nome no banco, SEMPRE usar (especialmente para Hotmart)
  // O nome do banco já foi atualizado pelo webhook da Hotmart para corresponder ao nome real
  if (currentName && currentName.trim() !== '') {
    return currentName
  }
  
  // Se não tem nome no banco, apenas para planos Stripe criar nome genérico
  const isStripePlan = stripePriceId.startsWith('price_') && 
                       !stripePriceId.includes('hotmart') && 
                       !hotmartId
  
  if (isStripePlan) {
    if (interval === 'MONTH') {
      return 'Assinatura mensal Stripe'
    }
    if (interval === 'YEAR') {
      return 'Assinatura anual Stripe'
    }
    return 'Assinatura Stripe'
  }
  
  // Para planos Hotmart sem nome (caso raro - não deveria acontecer se webhook funcionou)
  // Usar stripePriceId como último recurso
  return stripePriceId
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
    const providerFilter: 'all' | 'stripe' | 'hotmart' = (searchParams.get('provider') as 'all' | 'stripe' | 'hotmart') || 'all'
    const planNameFilter = searchParams.get('planName') || null
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
                id: true,
                name: true,
                interval: true,
                intervalCount: true,
                stripePriceId: true,
                hotmartOfferKey: true,
                hotmartId: true,
                currency: true
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

    // ⚠️ NOTA: Paginação será aplicada APÓS os filtros (plano e provedor)
    // Por isso processamos TODOS os usuários primeiro

    // 🔍 DEBUG: Log da busca
    // Processa os dados dos usuários (TODOS, antes dos filtros)
    const processedUsers = await Promise.all(allUsers.map(async user => {
      // Determina se tem subscription ativa usando fonte de verdade
      const activeSubscription = user.subscriptions.find(sub => 
        ['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) &&
        sub.currentPeriodEnd >= new Date()
      )

      // Buscar assinaturas expiradas
      const expiredSubscriptions = user.subscriptions.filter(sub => 
        !['active', 'ACTIVE', 'cancel_at_period_end'].includes(sub.status) ||
        sub.currentPeriodEnd < new Date()
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
          planName: getCorrectPlanName(
            activeSubscription.plan.stripePriceId, 
            activeSubscription.plan.interval, 
            activeSubscription.plan.name,
            activeSubscription.plan.hotmartId || null,
            activeSubscription.plan.currency
          ),
          planInterval: activeSubscription.plan.interval, // Adicionar intervalo do plano
          planProvider: activeSubscription.plan.hotmartId || activeSubscription.plan.hotmartOfferKey 
            ? 'Hotmart' 
            : activeSubscription.plan.stripePriceId?.startsWith('price_') 
              ? 'Stripe' 
              : null, // Provedor do plano (Hotmart ou Stripe)
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
          currentPeriodStart: activeSubscription.currentPeriodStart.toISOString()
        } : null,
        // 🔍 DEBUG: Adicionar informações sobre assinaturas expiradas
        expiredSubscriptions: expiredSubscriptions.length > 0 ? expiredSubscriptions.map(sub => ({
          id: sub.id,
          planName: getCorrectPlanName(
            sub.plan.stripePriceId, 
            sub.plan.interval, 
            sub.plan.name,
            sub.plan.hotmartId || null,
            sub.plan.currency
          ),
          planProvider: sub.plan.hotmartId || sub.plan.hotmartOfferKey 
            ? 'Hotmart' 
            : sub.plan.stripePriceId?.startsWith('price_') 
              ? 'Stripe' 
              : null,
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
      filteredUsers = filteredUsers.filter(user => user.plan === planFilter)
    }

    // Filtra por provedor (Stripe/Hotmart) se especificado
    if (providerFilter !== 'all') {
      const filterValueLower = String(providerFilter).toLowerCase().trim()
      
      filteredUsers = filteredUsers.filter(user => {
        // Coletar todos os provedores de todas as assinaturas (ativas e expiradas)
        const allProviders: string[] = []
        
        // Adicionar provedor da assinatura ativa (se existir)
        if (user.subscriptionDetails?.planProvider) {
          const activeProvider = String(user.subscriptionDetails.planProvider).toLowerCase().trim()
          if (activeProvider && !allProviders.includes(activeProvider)) {
            allProviders.push(activeProvider)
          }
        }
        
        // Adicionar provedores das assinaturas expiradas (se existirem)
        if (user.expiredSubscriptions && user.expiredSubscriptions.length > 0) {
          user.expiredSubscriptions.forEach(expiredSub => {
            if (expiredSub.planProvider) {
              const expiredProvider = String(expiredSub.planProvider).toLowerCase().trim()
              if (expiredProvider && !allProviders.includes(expiredProvider)) {
                allProviders.push(expiredProvider)
              }
            }
          })
        }
        
        // Se o usuário não tem nenhuma assinatura (nem ativa nem expirada), não passa pelo filtro
        if (allProviders.length === 0) {
          return false
        }
        
        // Verificar se o provedor do filtro está presente em qualquer assinatura
        const matches = allProviders.some(provider => provider === filterValueLower)
        
        return matches
      })
    }

    // Filtra por nome do plano (ativas e inativas) se especificado
    if (planNameFilter) {
      const filterPlanNameLower = String(planNameFilter).toLowerCase().trim()
      
      filteredUsers = filteredUsers.filter(user => {
        // Verificar assinatura ativa primeiro
        if (user.hasActiveSubscription && user.subscriptionDetails) {
          const planName = user.subscriptionDetails.planName || ''
          const planNameLower = planName.toLowerCase().trim()
          if (planNameLower === filterPlanNameLower) {
            return true
          }
        }
        
        // Se não encontrou na ativa, verificar nas expiradas
        if (user.expiredSubscriptions && user.expiredSubscriptions.length > 0) {
          return user.expiredSubscriptions.some(expiredSub => {
            const planName = expiredSub.planName || ''
            const planNameLower = planName.toLowerCase().trim()
            return planNameLower === filterPlanNameLower
          })
        }
        
        return false
      })
      
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
    
    // ⚠️ IMPORTANTE: Aplicar paginação APÓS os filtros
    const paginatedUsers = filteredUsers.slice(skip, skip + limit)
    
    // Total de usuários após filtros (para paginação e estatísticas)
    const totalFilteredUsers = filteredUsers.length

    const stats = {
      totalUsers: totalFilteredUsers, // Usar total filtrado
      premiumUsers: premiumUsersCount,
      freeUsers: totalFilteredUsers - premiumUsersCount,
      adminUsers: adminUsersCount,
      activeUsers: activeUsersCount
    }

    const response = {
      users: paginatedUsers, // Usar usuários paginados após filtros
      pagination: {
        page,
        limit,
        total: totalFilteredUsers, // Total após filtros
        totalPages: Math.ceil(totalFilteredUsers / limit)
      },
      stats
    }

    return NextResponse.json(response)

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

// src/app/api/admin/plans/names/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * GET - Retorna lista de nomes únicos de planos (com assinaturas ativas, inativas e todos os planos cadastrados)
 * Usado para popular o dropdown de filtro por nome do plano
 */
export async function GET() {
  try {
    console.log('[ADMIN PLANS NAMES API] 🔍 Iniciando busca de nomes de planos...')
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      console.log('[ADMIN PLANS NAMES API] ❌ Não autorizado:', session?.user?.email)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    console.log('[ADMIN PLANS NAMES API] ✅ Autenticado:', session.user.email)

    // 1. Buscar TODOS os planos cadastrados no banco (independente de terem assinaturas)
    const allPlansInDatabase = await prisma.plan.findMany({
      select: {
        id: true,
        name: true,
        stripePriceId: true,
        interval: true,
        intervalCount: true,
        hotmartId: true,
        hotmartOfferKey: true,
        currency: true,
        active: true
      }
    })

    console.log('[ADMIN PLANS NAMES API] 📊 Planos cadastrados no banco:', allPlansInDatabase.length)

    // 2. Buscar TODAS as assinaturas (ativas e inativas) para garantir que capturamos todos os planos em uso
    const allSubscriptions = await prisma.subscription.findMany({
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            stripePriceId: true,
            interval: true,
            intervalCount: true,
            hotmartId: true,
            hotmartOfferKey: true,
            currency: true
          }
        }
      },
      distinct: ['planId'] // Apenas uma assinatura por plano para evitar duplicatas
    })

    console.log('[ADMIN PLANS NAMES API] 📊 Planos com assinaturas (ativas ou inativas):', allSubscriptions.length)

    // 3. Combinar planos do banco e planos com assinaturas
    const allPlansMap = new Map<string, {
      id: string
      name: string
      stripePriceId: string
      interval: string | null
      intervalCount: number | null
      hotmartId: number | null
      hotmartOfferKey: string | null
      currency: string | null
    }>()

    // Adicionar todos os planos do banco
    allPlansInDatabase.forEach(plan => {
      allPlansMap.set(plan.id, {
        id: plan.id,
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        hotmartId: plan.hotmartId,
        hotmartOfferKey: plan.hotmartOfferKey,
        currency: plan.currency
      })
    })

    // Adicionar planos de assinaturas (pode adicionar planos que não estão mais no banco)
    allSubscriptions.forEach(sub => {
      if (sub.plan) {
        allPlansMap.set(sub.plan.id, {
          id: sub.plan.id,
          name: sub.plan.name,
          stripePriceId: sub.plan.stripePriceId,
          interval: sub.plan.interval,
          intervalCount: sub.plan.intervalCount,
          hotmartId: sub.plan.hotmartId,
          hotmartOfferKey: sub.plan.hotmartOfferKey,
          currency: sub.plan.currency
        })
      }
    })

    const allPlans = Array.from(allPlansMap.values())
    console.log('[ADMIN PLANS NAMES API] 📊 Total de planos únicos encontrados:', allPlans.length)

    // Função para obter o nome correto do plano (mesma lógica da API de usuários)
    function getCorrectPlanName(
      stripePriceId: string, 
      interval: string | null, 
      currentName?: string,
      hotmartId?: number | null,
      _currency?: string | null
    ): string {
      // Se tem nome no banco, SEMPRE usar
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
      
      // Para planos Hotmart sem nome (caso raro)
      return stripePriceId
    }

    // Extrair nomes únicos dos planos
    const planNames = allPlans.map(plan => {
      const planName = getCorrectPlanName(
        plan.stripePriceId,
        plan.interval,
        plan.name,
        plan.hotmartId || null,
        plan.currency
      )
      console.log('[ADMIN PLANS NAMES API] 🔍 Plano encontrado:', {
        planId: plan.id,
        planName: planName,
        stripePriceId: plan.stripePriceId,
        interval: plan.interval,
        hotmartId: plan.hotmartId
      })
      return planName
    })

    // Remover duplicatas e ordenar
    const uniquePlanNames = Array.from(new Set(planNames)).sort()

    console.log('[ADMIN PLANS NAMES API] 📊 Total de planos (antes de remover duplicatas):', planNames.length)
    console.log('[ADMIN PLANS NAMES API] ✅ Retornando', uniquePlanNames.length, 'nomes únicos de planos')
    console.log('[ADMIN PLANS NAMES API] 📋 Nomes dos planos:', uniquePlanNames)
    
    return NextResponse.json({
      planNames: uniquePlanNames
    })

  } catch (error) {
    console.error('[ADMIN PLANS NAMES API] ❌ Erro ao buscar nomes de planos:', error)
    if (error instanceof Error) {
      console.error('[ADMIN PLANS NAMES API] ❌ Stack trace:', error.stack)
      console.error('[ADMIN PLANS NAMES API] ❌ Mensagem:', error.message)
    }
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


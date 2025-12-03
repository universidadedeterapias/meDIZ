// src/app/api/admin/plans/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Listar todos os planos
export async function GET() {
  try {
    console.log('[ADMIN PLANS API] 🔍 Iniciando busca de planos...')
    const session = await auth()

    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      console.log('[ADMIN PLANS API] ❌ Não autorizado:', session?.user?.email)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    console.log('[ADMIN PLANS API] ✅ Autenticado:', session.user.email)

    // 1. Buscar planos Hotmart ativos (como antes)
    console.log('[ADMIN PLANS API] 🔍 Buscando planos Hotmart...')
    let hotmartPlans
    try {
      hotmartPlans = await prisma.plan.findMany({
        where: {
          OR: [
            { stripePriceId: { contains: 'hotmart' } },
            { hotmartOfferKey: { not: null } },
            { hotmartId: { not: null } }
          ],
          active: true
        },
        select: {
          id: true,
          name: true,
          stripePriceId: true,
          monthlyLimit: true,
          createdAt: true,
          updatedAt: true,
          active: true,
          amount: true,
          currency: true,
          interval: true,
          intervalCount: true,
          stripeProductId: true,
          trialPeriodDays: true,
          hotmartOfferKey: true,
          hotmartId: true
        }
      })
      console.log('[ADMIN PLANS API] ✅ Planos Hotmart encontrados:', hotmartPlans.length)
    } catch (error) {
      console.error('[ADMIN PLANS API] ❌ Erro ao buscar planos Hotmart:', error)
      throw error
    }

    // 2. Buscar planos do Stripe (ativos no banco OU com assinaturas ativas)
    // Planos do Stripe são identificados por stripePriceId começando com "price_"
    // e que NÃO contêm "hotmart" (para não pegar planos Hotmart que usam formato similar)
    console.log('[ADMIN PLANS API] 🔍 Buscando planos do Stripe...')
    let stripePlans
    try {
      stripePlans = await prisma.plan.findMany({
        where: {
          AND: [
            {
              stripePriceId: {
                startsWith: 'price_',
                not: {
                  contains: 'hotmart'
                }
              }
            },
            // ⚠️ CRÍTICO: Excluir planos que têm hotmartId ou hotmartOfferKey
            // Esses são planos Hotmart, não Stripe
            {
              hotmartId: null
            },
            {
              hotmartOfferKey: null
            }
          ]
        },
        select: {
          id: true,
          name: true,
          stripePriceId: true,
          monthlyLimit: true,
          createdAt: true,
          updatedAt: true,
          active: true,
          amount: true,
          currency: true,
          interval: true,
          intervalCount: true,
          stripeProductId: true,
          trialPeriodDays: true,
          hotmartOfferKey: true,
          hotmartId: true
        }
      })
      console.log('[ADMIN PLANS API] ✅ Planos Stripe encontrados:', stripePlans.length)
    } catch (error) {
      console.error('[ADMIN PLANS API] ❌ Erro ao buscar planos Stripe:', error)
      throw error
    }

    // 3. Combinar e ordenar todos os planos
    console.log('[ADMIN PLANS API] 🔍 Combinando planos...')
    const allPlans = [...hotmartPlans, ...stripePlans]
    console.log('[ADMIN PLANS API] 📊 Total de planos antes de remover duplicatas:', allPlans.length)

    // Remover duplicatas (caso algum plano apareça em ambas as queries)
    const uniquePlans = Array.from(
      new Map(allPlans.map(plan => [plan.id, plan])).values()
    )
    console.log('[ADMIN PLANS API] 📊 Total de planos únicos:', uniquePlans.length)

    // Ordenar
    console.log('[ADMIN PLANS API] 🔍 Ordenando planos...')
    const sortedPlans = uniquePlans.sort((a, b) => {
      // Primeiro por moeda
      const currencyOrder = (a.currency || '').localeCompare(b.currency || '')
      if (currencyOrder !== 0) return currencyOrder

      // Depois por intervalo
      const intervalOrder = (a.interval || '').localeCompare(b.interval || '')
      if (intervalOrder !== 0) return intervalOrder

      // Por último por trialPeriodDays
      const trialA = a.trialPeriodDays || 0
      const trialB = b.trialPeriodDays || 0
      return trialA - trialB
    })

    console.log('[ADMIN PLANS API] ✅ Retornando', sortedPlans.length, 'planos')
    return NextResponse.json(sortedPlans)

  } catch (error) {
    console.error('[ADMIN PLANS API] ❌ Erro ao buscar planos:', error)
    if (error instanceof Error) {
      console.error('[ADMIN PLANS API] ❌ Stack trace:', error.stack)
      console.error('[ADMIN PLANS API] ❌ Mensagem:', error.message)
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

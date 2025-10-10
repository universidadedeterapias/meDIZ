// src/app/api/ab-testing/tracking/route.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Simulação de banco de dados para tracking de testes A/B
interface Tracking {
  userId: string
  testId: string
  variantId: string
  type: 'impression' | 'conversion'
  timestamp: Date
  value?: number
}

const trackingDatabase: Tracking[] = []

// POST - Registra uma impressão ou conversão
export async function POST(req: Request) {
  // Não exigimos autenticação completa para tracking, apenas uma sessão válida
  const session = await auth()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 })
  }
  
  try {
    const { testId, variantId, type, value } = await req.json()
    
    if (!testId || !variantId || !type) {
      return NextResponse.json({ 
        error: 'Dados incompletos. testId, variantId e type são obrigatórios.' 
      }, { status: 400 })
    }
    
    // Verifica se o tipo é válido
    if (type !== 'impression' && type !== 'conversion') {
      return NextResponse.json({ 
        error: 'Tipo inválido. Use "impression" ou "conversion".' 
      }, { status: 400 })
    }
    
    // Registra o evento
    const trackingEvent: Tracking = {
      userId: session.user.id,
      testId,
      variantId,
      type,
      timestamp: new Date(),
      value: type === 'conversion' ? value : undefined
    }
    
    trackingDatabase.push(trackingEvent)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao registrar tracking:', error)
    return NextResponse.json({ error: 'Erro ao processar evento de tracking' }, { status: 500 })
  }
}

// GET - Obtém estatísticas de um teste específico
export async function GET(req: Request) {
  const session = await auth()
  
  // Verificação básica de permissão
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  const { searchParams } = new URL(req.url)
  const testId = searchParams.get('testId')
  
  if (!testId) {
    return NextResponse.json({ error: 'testId não fornecido' }, { status: 400 })
  }
  
  try {
    // Filtra eventos do teste específico
    const testEvents = trackingDatabase.filter(event => event.testId === testId)
    
    // Agrupa por variante
    const variantStats: Record<string, { 
      impressions: number, 
      conversions: number
    }> = {}
    
    testEvents.forEach(event => {
      if (!variantStats[event.variantId]) {
        variantStats[event.variantId] = { impressions: 0, conversions: 0 }
      }
      
      if (event.type === 'impression') {
        variantStats[event.variantId].impressions++
      } else if (event.type === 'conversion') {
        variantStats[event.variantId].conversions++
      }
    })
    
    // Calcula estatísticas gerais
    const totalImpressions = Object.values(variantStats).reduce(
      (sum, stats) => sum + stats.impressions, 
      0
    )
    
    const totalConversions = Object.values(variantStats).reduce(
      (sum, stats) => sum + stats.conversions, 
      0
    )
    
    const results = {
      testId,
      totalImpressions,
      totalConversions,
      overallConversionRate: totalImpressions > 0 
        ? (totalConversions / totalImpressions) * 100 
        : 0,
      variants: Object.entries(variantStats).map(([variantId, stats]) => ({
        variantId,
        impressions: stats.impressions,
        conversions: stats.conversions,
        conversionRate: stats.impressions > 0 
          ? (stats.conversions / stats.impressions) * 100 
          : 0
      }))
    }
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error)
    return NextResponse.json({ error: 'Erro ao processar estatísticas' }, { status: 500 })
  }
}

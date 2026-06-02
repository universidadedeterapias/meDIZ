// app/api/symptoms/dashboard/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { formatSymptom } from '@/lib/formatSymptom'
import { getCurrentLanguage } from '@/i18n/server'

// Função para validar se é um sintoma válido
function isValidSymptom(sintoma: string): boolean {
  if (!sintoma || sintoma.trim().length < 3) return false
  
  const palavrasInadequadas = [
    'teste', 'testando', 'oi', 'olá', 'hello', 'hi',
    'nada', 'nenhum', 'qualquer', 'coisa', 'algo',
    'problema', 'issue', 'bug', 'erro', 'falha'
  ]
  
  const lower = sintoma.toLowerCase()
  return !palavrasInadequadas.some(palavra => lower.includes(palavra))
}

// GET - Dashboard de sintomas do usuário
export async function GET(_req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    
    // Usar idioma do cookie (idioma atual selecionado) ao invés do preferredLanguage do banco
    // Isso garante que os sintomas sejam traduzidos conforme o idioma selecionado no seletor
    const userLanguage = await getCurrentLanguage()
    
    // Buscar sintomas salvos
    const savedSymptoms = await prisma.savedSymptom.findMany({
      where: {
        folder: {
          userId
        }
      },
      include: {
        folder: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Buscar sessões de chat do usuário
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId,
        threadId: {
          not: null
        }
      },
      select: {
        id: true,
        threadId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // OTIMIZAÇÃO: Buscar todas as mensagens de uma vez ao invés de fazer N queries
    const sessionIds = chatSessions.map(s => s.id)
    
    // Buscar todas as mensagens de usuário de uma vez
    const allMessages = await prisma.chatMessage.findMany({
      where: {
        chatSessionId: {
          in: sessionIds
        },
        role: 'USER'
      },
      select: {
        chatSessionId: true,
        content: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    // Criar mapa de chatSessionId -> primeira mensagem (apenas a primeira de cada sessão)
    const sessionIdToFirstMessage = new Map<string, string>()
    for (const msg of allMessages) {
      if (!sessionIdToFirstMessage.has(msg.chatSessionId)) {
        sessionIdToFirstMessage.set(msg.chatSessionId, msg.content)
      }
    }

    // Processar sintomas pesquisados no chat
    const symptomMap = new Map<string, { count: number; dates: Date[] }>()
    
    for (const session of chatSessions) {
      if (!session.threadId) continue
      
      const firstMessage = sessionIdToFirstMessage.get(session.id) || ''
      const symptomText = firstMessage.trim()
      
      if (isValidSymptom(symptomText)) {
        const formatted = formatSymptom(symptomText, userLanguage)
        const existing = symptomMap.get(formatted)
        
        if (existing) {
          existing.count++
          existing.dates.push(session.createdAt)
        } else {
          symptomMap.set(formatted, {
            count: 1,
            dates: [session.createdAt]
          })
        }
      }
    }

    // Converter para array e ordenar
    const searchedSymptoms = Array.from(symptomMap.entries())
      .map(([symptom, data]) => ({
        symptom,
        count: data.count,
        lastSearched: data.dates.sort((a, b) => b.getTime() - a.getTime())[0]
      }))
      .sort((a, b) => b.count - a.count)

    // Agrupar por período (últimos 30 dias, 7 dias, hoje)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const frequencyByPeriod = {
      today: searchedSymptoms.filter(s => {
        const date = new Date(s.lastSearched)
        return date >= today
      }).length,
      last7Days: searchedSymptoms.filter(s => {
        const date = new Date(s.lastSearched)
        return date >= last7Days
      }).length,
      last30Days: searchedSymptoms.filter(s => {
        const date = new Date(s.lastSearched)
        return date >= last30Days
      }).length,
      allTime: searchedSymptoms.length
    }

    // Top sintomas pesquisados
    const topSearched = searchedSymptoms.slice(0, 10)

    // Estatísticas de sintomas salvos
    const savedStats = {
      total: savedSymptoms.length,
      withAdditionalInfo: savedSymptoms.filter(s => 
        s.symptomStartPeriod || s.emotionalHistory || s.copingStrategy
      ).length,
      byCopingStrategy: savedSymptoms.reduce((acc, s) => {
        if (s.copingStrategy) {
          acc[s.copingStrategy] = (acc[s.copingStrategy] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
    }

    // Retornar todos os dados completos para todos os usuários
    const response = {
      searchedSymptoms: {
        total: searchedSymptoms.length,
        top: topSearched,
        frequencyByPeriod
      },
      savedSymptoms: {
        total: savedStats.total,
        withAdditionalInfo: savedStats.withAdditionalInfo,
        byCopingStrategy: savedStats.byCopingStrategy,
        recent: savedSymptoms.slice(0, 10).map(s => ({
          id: s.id,
          symptom: s.symptom,
          folderName: s.folder.name,
          createdAt: s.createdAt,
          hasAdditionalInfo: !!(s.symptomStartPeriod || s.emotionalHistory || s.copingStrategy)
        }))
      },
      isPremium: true // Mantido para compatibilidade, mas não usado mais para restrições
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API Dashboard] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dashboard' },
      { status: 500 }
    )
  }
}


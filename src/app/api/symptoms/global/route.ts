// app/api/symptoms/global/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isUserPremium } from '@/lib/premiumUtils'
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

// GET - Dados globais de sintomas (por país)
export async function GET(_req: Request) {
  const startTime = Date.now()
  console.log('[API Global] 🚀 Iniciando requisição de dados globais')
  
  try {
    const authStart = Date.now()
    const session = await auth()
    console.log('[API Global] ⏱️ Auth levou', Date.now() - authStart, 'ms')
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const premiumStart = Date.now()
    const isPremium = await isUserPremium(session.user.id)
    console.log('[API Global] ⏱️ Verificação premium levou', Date.now() - premiumStart, 'ms')
    
    // Verificar se é premium (dados globais apenas para premium)
    if (!isPremium) {
      return NextResponse.json({ 
        error: 'Funcionalidade disponível apenas para usuários premium',
        isPremium: false
      }, { status: 403 })
    }

    // Usar idioma do cookie (idioma atual selecionado) ao invés do preferredLanguage do banco
    // Isso garante que os sintomas sejam traduzidos conforme o idioma selecionado no seletor
    const userLanguage = await getCurrentLanguage()

    // Buscar todas as sessões de chat (últimos 90 dias para performance)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const dbQueryStart = Date.now()
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: ninetyDaysAgo
        }
      },
      select: {
        id: true,
        threadId: true
      },
      take: 1000 // Limitar para performance
    })
    console.log('[API Global] ⏱️ Query de sessões levou', Date.now() - dbQueryStart, 'ms')
    console.log('[API Global] 📊 Total de sessões encontradas:', chatSessions.length)

    // OTIMIZAÇÃO: Buscar todas as mensagens de uma vez ao invés de fazer N queries
    const processingStart = Date.now()
    console.log('[API Global] 🔄 Iniciando processamento otimizado de', chatSessions.length, 'sessões')
    
    const validSessionIds = chatSessions
      .filter(s => s.threadId)
      .map(s => s.id)
    
    // Buscar todas as mensagens de usuário de uma vez
    const messagesQueryStart = Date.now()
    const allMessages = await prisma.chatMessage.findMany({
      where: {
        chatSessionId: {
          in: validSessionIds
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
    console.log('[API Global] ⏱️ Query otimizada de mensagens levou', Date.now() - messagesQueryStart, 'ms')
    console.log('[API Global] 📊 Total de mensagens encontradas:', allMessages.length)
    
    // Criar mapa de chatSessionId -> primeira mensagem (apenas a primeira de cada sessão)
    const sessionIdToFirstMessage = new Map<string, string>()
    for (const msg of allMessages) {
      if (!sessionIdToFirstMessage.has(msg.chatSessionId)) {
        sessionIdToFirstMessage.set(msg.chatSessionId, msg.content)
      }
    }
    console.log('[API Global] 📊 Sessões com primeira mensagem:', sessionIdToFirstMessage.size)
    
    // Processar sintomas globais (sem divisão por país)
    const globalSymptoms = new Map<string, number>()
    
    let processedCount = 0
    let skippedCount = 0
    const symptomSamples: Array<{ original: string; formatted: string }> = []
    
    for (const session of chatSessions) {
      if (!session.threadId) {
        skippedCount++
        continue
      }
      
      const firstMessage = sessionIdToFirstMessage.get(session.id) || ''
      const symptomText = firstMessage.trim()
      
      if (!symptomText) {
        skippedCount++
        continue
      }
      
      if (isValidSymptom(symptomText)) {
        const formatted = formatSymptom(symptomText, userLanguage)
        
        // DEBUG: Coletar amostras para análise (apenas se houver mudança)
        if (symptomSamples.length < 10 && formatted !== symptomText) {
          symptomSamples.push({
            original: symptomText,
            formatted: formatted
          })
        }
        
        globalSymptoms.set(formatted, (globalSymptoms.get(formatted) || 0) + 1)
        processedCount++
      } else {
        skippedCount++
      }
    }
    
    // DEBUG: Log de amostras apenas se houver mudanças
    if (symptomSamples.length > 0) {
      console.log('[API Global] 🔍 Amostras de sintomas traduzidos/corrigidos:')
      symptomSamples.forEach((sample, idx) => {
        console.log(`  ${idx + 1}. "${sample.original}" → "${sample.formatted}"`)
      })
    }
    
    const processingDuration = Date.now() - processingStart
    console.log('[API Global] ✅ Processamento concluído:')
    console.log('  - Sessões processadas:', processedCount)
    console.log('  - Sessões ignoradas:', skippedCount)
    console.log('  - Tempo total:', processingDuration, 'ms')
    if (chatSessions.length > 0) {
      console.log('  - Tempo médio por sessão:', (processingDuration / chatSessions.length).toFixed(2), 'ms')
    }

    // Converter para formato de resposta - Top 20 sintomas globais
    const formatStart = Date.now()
    const globalTop = Array.from(globalSymptoms.entries())
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
    
    console.log('[API Global] ⏱️ Formatação levou', Date.now() - formatStart, 'ms')

    const totalTime = Date.now() - startTime
    console.log('[API Global] 🎉 Requisição completa em', totalTime, 'ms')
    console.log('[API Global] 📊 Estatísticas finais:')
    console.log('  - Sintomas únicos globais:', globalSymptoms.size)
    console.log('  - Total de pesquisas:', Array.from(globalSymptoms.values()).reduce((a, b) => a + b, 0))

    return NextResponse.json({
      global: {
        topSymptoms: globalTop,
        totalSearches: Array.from(globalSymptoms.values()).reduce((a, b) => a + b, 0)
      },
      period: 'Últimos 90 dias'
    })
  } catch (error) {
    console.error('[API Global] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados globais' },
      { status: 500 }
    )
  }
}


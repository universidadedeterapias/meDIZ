// API para exportar sintomas mais pesquisados
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface SintomaData {
  sintoma: string
  quantidade: number
  primeiraPesquisa: Date
  ultimaPesquisa: Date
  threadIds: string[]
}

export async function POST(req: Request) {
  const startedAt = Date.now()
  try {
    const session = await auth()

    // Verifica se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { 
      startDate, 
      endDate,
      period = 'all' // 'all', 'today', 'week', 'month', 'custom'
    } = await req.json()

    console.log('🔍 Iniciando extração de sintomas mais pesquisados...')
    
    // 1. Calcula filtros de data baseado no período
    let dateFilter: Record<string, unknown> = {}
    
    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      dateFilter = {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      dateFilter = {
        createdAt: {
          gte: weekAgo
        }
      }
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      
      dateFilter = {
        createdAt: {
          gte: monthAgo
        }
      }
    } else if (period === 'custom' && startDate && endDate) {
      const customStart = new Date(startDate)
      const customEnd = new Date(endDate)
      customEnd.setHours(23, 59, 59, 999)

      if (customStart > customEnd) {
        return NextResponse.json(
          { error: 'Período inválido: data inicial maior que data final' },
          { status: 400 }
        )
      }

      dateFilter = {
        createdAt: {
          gte: customStart,
          lte: customEnd
        }
      }
    }
    
    console.log(`📅 Filtro de período: ${period}`, dateFilter)
    
    // 2. Busca sessões com primeira mensagem do usuário em uma única query
    // Evita N+1 e reduz timeout em produção.
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        threadId: {
          not: null
        },
        ...dateFilter
      },
      select: {
        createdAt: true,
        messages: {
          where: {
            role: 'USER'
          },
          orderBy: {
            createdAt: 'asc'
          },
          take: 1,
          select: {
            content: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📈 Encontradas ${chatSessions.length} sessões com threadId`)

    if (chatSessions.length === 0) {
      const emptyCsv =
        'Sintoma Pesquisado,Quantidade de Pesquisas,Data da Primeira Pesquisa,Data da Última Pesquisa\n'
      return NextResponse.json({
        success: true,
        data: [],
        csv: emptyCsv,
        summary: {
          totalSintomas: 0,
          totalPesquisas: 0,
          sintomaMaisPesquisado: '',
          quantidadeMaisPesquisado: 0,
          top10: []
        },
        message: 'Nenhuma sessão encontrada no período'
      })
    }

    // 3. Agrupa pela primeira mensagem do usuário (sintoma)
    const sintomasMap = new Map<string, SintomaData>()
    let processadas = 0
    let semMensagemUsuario = 0

    console.log('🔄 Processando mensagens dos usuários (modo otimizado)...')

    for (const session of chatSessions) {
      const sintoma = session.messages[0]?.content?.trim()
      if (!sintoma) {
        semMensagemUsuario++
        continue
      }

      if (sintomasMap.has(sintoma)) {
        const existing = sintomasMap.get(sintoma)!
        existing.quantidade++
        existing.ultimaPesquisa = session.createdAt
        existing.threadIds.push('N/A')

        if (session.createdAt < existing.primeiraPesquisa) {
          existing.primeiraPesquisa = session.createdAt
        }
      } else {
        sintomasMap.set(sintoma, {
          sintoma,
          quantidade: 1,
          primeiraPesquisa: session.createdAt,
          ultimaPesquisa: session.createdAt,
          threadIds: ['N/A']
        })
      }

      processadas++
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões, ${semMensagemUsuario} sem mensagem de usuário`)

    // 3. Converte para array e ordena por quantidade
    const sintomasArray = Array.from(sintomasMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)

    console.log(`📋 Encontrados ${sintomasArray.length} sintomas únicos`)

    // 4. Formata dados para CSV
    const csvData = sintomasArray.map(sintoma => ({
      sintoma: sintoma.sintoma,
      quantidade: sintoma.quantidade,
      primeiraPesquisa: sintoma.primeiraPesquisa.toLocaleDateString('pt-BR'),
      ultimaPesquisa: sintoma.ultimaPesquisa.toLocaleDateString('pt-BR')
    }))

    // 5. Gera CSV
    const csvHeader = 'Sintoma Pesquisado,Quantidade de Pesquisas,Data da Primeira Pesquisa,Data da Última Pesquisa\n'
    
    const csvRows = csvData.map(sintoma => {
      const sintomaEscaped = `"${sintoma.sintoma.replace(/"/g, '""')}"`
      return `${sintomaEscaped},${sintoma.quantidade},${sintoma.primeiraPesquisa},${sintoma.ultimaPesquisa}`
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // 6. Retorna dados
    const elapsedMs = Date.now() - startedAt
    console.log(`⏱️ Exportação de sintomas finalizada em ${elapsedMs}ms`)
    return NextResponse.json({
      success: true,
      data: csvData,
      csv: csvContent,
      summary: {
        totalSintomas: sintomasArray.length,
        totalPesquisas: sintomasArray.reduce((sum, s) => sum + s.quantidade, 0),
        sintomaMaisPesquisado: sintomasArray[0]?.sintoma,
        quantidadeMaisPesquisado: sintomasArray[0]?.quantidade,
        top10: sintomasArray.slice(0, 10).map((s, i) => ({
          posicao: i + 1,
          sintoma: s.sintoma,
          quantidade: s.quantidade
        }))
      }
    })

  } catch (error) {
    console.error('❌ Erro durante a execução:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

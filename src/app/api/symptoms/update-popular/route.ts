// API para buscar sintomas populares (usado pelo job semanal)
import { prisma } from '@/lib/prisma'
import { getUserMessages } from '@/lib/assistant'
import { NextResponse } from 'next/server'

interface SintomaData {
  sintoma: string
  quantidade: number
}

// Lista de palavras inadequadas
const PALAVRAS_INADEQUADAS = [
  'teste', 'testando', 'oi', 'olá', 'hello', 'hi',
  'nada', 'nenhum', 'qualquer', 'coisa', 'algo',
  'problema', 'issue', 'bug', 'erro', 'falha',
  'xxx', 'sexo', 'porn', 'adulto', 'proibido',
  'hack', 'crack', 'virus', 'malware', 'spam',
  'fake', 'falso', 'mentira', 'fraude', 'golpe'
]

// Sintomas sempre fixos (sempre incluídos)
const SINTOMAS_FIXOS = [
  'Dor de cabeça',
  'Dor nas costas',
  'Ansiedade',
  'Cansaço',
  'Insônia'
]

// Função para validar sintoma
function isValidSymptom(sintoma: string): boolean {
  // Remove espaços extras e converte para minúsculo
  const cleanSymptom = sintoma.trim().toLowerCase()
  
  // Deve ter pelo menos 3 caracteres
  if (cleanSymptom.length < 3) return false
  
  // Não pode ser palavra inadequada
  if (PALAVRAS_INADEQUADAS.includes(cleanSymptom)) return false
  
  // Aceita sintomas com 1 palavra OU sintomas específicos como "dor de cabeça"
  const palavras = cleanSymptom.split(' ')
  
  // Aceita se for 1 palavra
  if (palavras.length === 1) return true
  
  // Aceita sintomas específicos conhecidos
  const sintomasConhecidos = [
    'dor de cabeça', 'dor nas costas', 'dor no joelho',
    'dor no peito', 'dor de garganta', 'dor de estômago',
    'pressão alta', 'pressão baixa', 'glicose alta',
    'colesterol alto', 'febre alta', 'tosse seca'
  ]
  
  return sintomasConhecidos.includes(cleanSymptom)
}

export async function POST(req: Request) {
  try {
    // Verifica se é admin (apenas para job semanal)
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    console.log('🔄 Iniciando atualização de sintomas populares...')
    
    // Busca sessões dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        threadId: {
          not: null
        },
        createdAt: {
          gte: thirtyDaysAgo
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

    console.log(`📈 Encontradas ${chatSessions.length} sessões dos últimos 30 dias`)

    if (chatSessions.length === 0) {
      // Se não há dados, retorna sintomas fixos
      const sintomasFixos = SINTOMAS_FIXOS.map(sintoma => ({
        sintoma,
        quantidade: 1,
        isFixed: true
      }))
      
      return NextResponse.json({
        success: true,
        sintomas: sintomasFixos,
        totalProcessados: 0,
        ultimaAtualizacao: new Date().toISOString()
      })
    }

    // Processa sintomas
    const sintomasMap = new Map<string, SintomaData>()
    let processadas = 0

    console.log('🔄 Processando mensagens dos usuários...')

    for (const session of chatSessions) {
      if (!session.threadId) continue

      try {
        // Recupera a mensagem original do usuário
        const userMessages = await getUserMessages(session.threadId)
        const sintomaOriginal = userMessages[0] || ''
        
        // Normaliza o sintoma
        const sintomaNormalizado = sintomaOriginal.trim()
        
        // Valida o sintoma
        if (!isValidSymptom(sintomaNormalizado)) {
          continue
        }

        // Capitaliza primeira letra de cada palavra
        const sintomaFormatado = sintomaNormalizado
          .split(' ')
          .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
          .join(' ')

        // Atualiza contagem
        if (sintomasMap.has(sintomaFormatado)) {
          sintomasMap.get(sintomaFormatado)!.quantidade++
        } else {
          sintomasMap.set(sintomaFormatado, {
            sintoma: sintomaFormatado,
            quantidade: 1
          })
        }

        processadas++
        
        // Pequena pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        console.error(`❌ Erro ao processar threadId ${session.threadId}:`, error)
        continue
      }
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões`)

    // Converte para array e ordena por quantidade
    const sintomasArray = Array.from(sintomasMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)

    // Adiciona sintomas fixos se não estiverem na lista
    const sintomasFinais = [...sintomasArray]
    
    SINTOMAS_FIXOS.forEach(sintomaFixo => {
      const jaExiste = sintomasFinais.some(s => s.sintoma === sintomaFixo)
      if (!jaExiste) {
        sintomasFinais.push({
          sintoma: sintomaFixo,
          quantidade: 1
        })
      }
    })

    // Pega os top 10
    const top10 = sintomasFinais
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    console.log(`📋 Top 10 sintomas:`, top10.map(s => `${s.sintoma} (${s.quantidade})`))

    // Salva no cache (simulado com arquivo por enquanto)
    const cacheData = {
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: new Date().toISOString(),
      periodo: '30 dias'
    }

    // Simula cache salvando em arquivo (em produção seria Redis)
    const fs = await import('fs')
    const path = await import('path')
    const cacheFile = path.join(process.cwd(), 'cache', 'sintomas-populares.json')
    
    // Cria diretório se não existir
    const cacheDir = path.join(process.cwd(), 'cache')
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true })
    }
    
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))

    return NextResponse.json({
      success: true,
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro durante atualização:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


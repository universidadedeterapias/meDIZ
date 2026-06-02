// Script otimizado para atualizar sintomas populares
// Processamento em lotes para melhor performance

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

interface JobLog {
  data: string
  sucesso: boolean
  sintomasProcessados: number
  totalSessoes: number
  erro?: string
  duracaoMs: number
}

interface SintomaData {
  sintoma: string
  quantidade: number
}

// Sintomas fixos como fallback
const SINTOMAS_FIXOS = [
  'Dor de cabeça', 'Dor nas costas', 'Ansiedade', 'Cansaço', 'Insônia',
  'Enxaqueca', 'Rinite', 'Dor no joelho', 'Estresse', 'Pressão alta'
]

function isValidSymptom(sintoma: string): boolean {
  if (!sintoma || sintoma.trim().length < 3) return false
  
  const lowerSintoma = sintoma.toLowerCase().trim()
  
  // Filtra palavras muito comuns que não são sintomas
  const palavrasComuns = [
    'oi', 'ola', 'olá', 'obrigado', 'obrigada', 'por favor', 'ajuda',
    'como', 'quando', 'onde', 'porque', 'por que', 'qual', 'quais',
    'tenho', 'sinto', 'estou', 'meu', 'minha', 'minhas', 'meus',
    'pode', 'poder', 'ser', 'estar', 'fazer', 'ter', 'haver',
    'muito', 'pouco', 'bem', 'mal', 'hoje', 'ontem', 'amanha',
    'sim', 'nao', 'não', 'talvez', 'claro', 'ok', 'beleza'
  ]
  
  if (palavrasComuns.includes(lowerSintoma)) return false
  
  // Filtra sintomas muito genéricos
  const sintomasGenericos = [
    'dor', 'problema', 'coisa', 'sintoma', 'doenca', 'doença',
    'mal', 'problemas', 'sintomas', 'doencas', 'doenças'
  ]
  
  if (sintomasGenericos.includes(lowerSintoma)) return false
  
  return true
}

async function updatePopularSymptomsOptimized() {
  const inicio = Date.now()
  const dataAtual = new Date().toISOString()
  
  console.log('🚀 Iniciando job otimizado de atualização de sintomas...')
  console.log(`📅 Data: ${dataAtual}`)
  
  try {
    // Busca sessões dos últimos 30 dias com limite para teste
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    console.log('🔍 Buscando sessões dos últimos 30 dias (limitado a 200 para teste)...')
    
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
      },
      take: 200 // Limita para teste e melhor performance
    })

    console.log(`📈 Encontradas ${chatSessions.length} sessões para processar`)

    if (chatSessions.length === 0) {
      console.log('⚠️ Nenhuma sessão encontrada, usando sintomas fixos')
      return createFallbackCache(dataAtual, inicio)
    }

    // Processa sintomas em lotes
    const sintomasMap = new Map<string, SintomaData>()
    let processadas = 0
    const BATCH_SIZE = 10 // Processa 10 sessões por vez

    console.log('🔄 Processando mensagens em lotes...')

    for (let i = 0; i < chatSessions.length; i += BATCH_SIZE) {
      const batch = chatSessions.slice(i, i + BATCH_SIZE)
      
      console.log(`⏳ Processando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chatSessions.length / BATCH_SIZE)} (${batch.length} sessões)...`)
      
      // Processa lote em paralelo
      const batchPromises = batch.map(async (session) => {
        try {
          const messages = await getUserMessages(session.threadId!)
          
          if (messages && messages.length > 0) {
            const firstMessage = messages[0]
            if (firstMessage && isValidSymptom(firstMessage)) {
              const sintoma = firstMessage.trim()
              const existing = sintomasMap.get(sintoma)
              sintomasMap.set(sintoma, {
                sintoma,
                quantidade: existing ? existing.quantidade + 1 : 1
              })
            }
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao processar sessão ${session.id}:`, error)
        }
      })

      await Promise.all(batchPromises)
      processadas += batch.length
      
      // Pequena pausa entre lotes para não sobrecarregar
      if (i + BATCH_SIZE < chatSessions.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões`)

    // Converte para array e ordena
    const allSintomas = Array.from(sintomasMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)

    console.log(`📋 Encontrados ${allSintomas.length} sintomas únicos`)

    // Se não há sintomas suficientes, adiciona sintomas fixos
    const sintomasFinais = [...allSintomas]
    
    SINTOMAS_FIXOS.forEach(sintomaFixo => {
      const jaExiste = sintomasFinais.some(s => s.sintoma === sintomaFixo)
      if (!jaExiste) {
        sintomasFinais.push({
          sintoma: sintomaFixo,
          quantidade: 1
        })
      }
    })

    // Top 10
    const top10 = sintomasFinais
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    console.log(`🎯 Top 10 sintomas:`, top10.map(s => `${s.sintoma} (${s.quantidade})`))

    const duracao = Date.now() - inicio

    // Salva cache
    const cacheData = {
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: dataAtual,
      periodo: '30 dias (otimizado)'
    }

    saveCache(cacheData)

    // Salva log de sucesso
    const logEntry: JobLog = {
      data: dataAtual,
      sucesso: true,
      sintomasProcessados: processadas,
      totalSessoes: processadas,
      duracaoMs: duracao
    }

    saveJobLog(logEntry)

    console.log('✅ Job otimizado concluído com sucesso!')
    console.log(`📊 Sintomas processados: ${processadas}`)
    console.log(`⏱️ Duração: ${duracao}ms`)

    return cacheData

  } catch (error) {
    const duracao = Date.now() - inicio
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    console.error('❌ Job falhou:', errorMessage)
    console.log(`⏱️ Duração: ${duracao}ms`)

    // Salva log de erro
    const logEntry: JobLog = {
      data: dataAtual,
      sucesso: false,
      sintomasProcessados: 0,
      totalSessoes: 0,
      erro: errorMessage,
      duracaoMs: duracao
    }

    saveJobLog(logEntry)

    throw error
  }
}

function createFallbackCache(dataAtual: string, inicio: number) {
  console.log('📝 Criando cache com sintomas fixos...')
  
  const sintomasFixos = SINTOMAS_FIXOS.map(sintoma => ({
    sintoma,
    quantidade: 1
  }))
  
  const duracao = Date.now() - inicio
  
  // Salva cache com sintomas fixos
  const cacheData = {
    sintomas: sintomasFixos,
    totalProcessados: 0,
    ultimaAtualizacao: dataAtual,
    periodo: 'Sintomas fixos (fallback)'
  }
  
  saveCache(cacheData)
  
  const logEntry: JobLog = {
    data: dataAtual,
    sucesso: true,
    sintomasProcessados: 0,
    totalSessoes: 0,
    duracaoMs: duracao
  }

  saveJobLog(logEntry)
  
  console.log('✅ Cache de fallback criado!')
  return cacheData
}

function saveCache(cacheData: Record<string, unknown>) {
  try {
    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
    
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))
    console.log('💾 Cache salvo com sucesso')
  } catch (error) {
    console.error('❌ Erro ao salvar cache:', error)
  }
}

function saveJobLog(logEntry: JobLog) {
  try {
    const logsDir = join(process.cwd(), 'logs')
    const logsFile = join(logsDir, 'sintomas-job-logs.json')
    
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }
    
    let logs: JobLog[] = []
    if (existsSync(logsFile)) {
      try {
        logs = JSON.parse(require('fs').readFileSync(logsFile, 'utf-8'))
      } catch (error) {
        console.warn('⚠️ Erro ao ler logs existentes, criando novo arquivo')
        logs = []
      }
    }
    
    logs.push(logEntry)
    
    // Mantém apenas os últimos 50 logs
    if (logs.length > 50) {
      logs = logs.slice(-50)
    }
    
    writeFileSync(logsFile, JSON.stringify(logs, null, 2))
    console.log('📝 Log salvo com sucesso')
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error)
  }
}

// Executa o script
updatePopularSymptomsOptimized()
  .then(() => {
    console.log('🎉 Script otimizado executado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })

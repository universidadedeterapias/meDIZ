// Script para executar job semanal de sintomas (versão simplificada)
// Executa: npm run run-symptoms-job

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

interface SintomaData {
  sintoma: string
  quantidade: number
}

interface JobLog {
  data: string
  sucesso: boolean
  sintomasProcessados: number
  totalSessoes: number
  erro?: string
  duracaoMs: number
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

// Sintomas sempre fixos
const SINTOMAS_FIXOS = [
  'Dor de cabeça',
  'Dor nas costas',
  'Ansiedade',
  'Cansaço',
  'Insônia'
]

function isValidSymptom(sintoma: string): boolean {
  const cleanSymptom = sintoma.trim().toLowerCase()
  
  if (cleanSymptom.length < 3) return false
  if (PALAVRAS_INADEQUADAS.includes(cleanSymptom)) return false
  
  const palavras = cleanSymptom.split(' ')
  
  if (palavras.length === 1) return true
  
  const sintomasConhecidos = [
    'dor de cabeça', 'dor nas costas', 'dor no joelho',
    'dor no peito', 'dor de garganta', 'dor de estômago',
    'pressão alta', 'pressão baixa', 'glicose alta',
    'colesterol alto', 'febre alta', 'tosse seca'
  ]
  
  return sintomasConhecidos.includes(cleanSymptom)
}

async function runSymptomsJob() {
  const inicio = Date.now()
  const dataAtual = new Date().toISOString()
  
  console.log('🚀 Executando job de sintomas...')
  console.log(`📅 Data: ${dataAtual}`)
  
  try {
    // Busca sessões dos últimos 30 dias (limitado para teste)
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
      },
      take: 100 // Limita para teste
    })

    console.log(`📈 Encontradas ${chatSessions.length} sessões`)

    if (chatSessions.length === 0) {
      console.log('⚠️ Nenhuma sessão encontrada, usando sintomas fixos')
      
      const sintomasFixos = SINTOMAS_FIXOS.map(sintoma => ({
        sintoma,
        quantidade: 1
      }))
      
      const cacheData = {
        sintomas: sintomasFixos,
        totalProcessados: 0,
        ultimaAtualizacao: dataAtual,
        periodo: '30 dias'
      }
      
      saveCache(cacheData)
      
      const logEntry: JobLog = {
        data: dataAtual,
        sucesso: true,
        sintomasProcessados: 0,
        totalSessoes: 0,
        duracaoMs: Date.now() - inicio
      }

      saveJobLog(logEntry)
      
      console.log('✅ Job concluído com sintomas fixos!')
      return
    }

    // Processa sintomas
    const sintomasMap = new Map<string, SintomaData>()
    let processadas = 0

    console.log('🔄 Processando mensagens...')

    for (const session of chatSessions) {
      if (!session.threadId) continue

      try {
        const userMessages = await getUserMessages(session.threadId)
        const sintomaOriginal = userMessages[0] || ''
        const sintomaNormalizado = sintomaOriginal.trim()
        
        if (!isValidSymptom(sintomaNormalizado)) {
          continue
        }

        const sintomaFormatado = sintomaNormalizado
          .split(' ')
          .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
          .join(' ')

        if (sintomasMap.has(sintomaFormatado)) {
          sintomasMap.get(sintomaFormatado)!.quantidade++
        } else {
          sintomasMap.set(sintomaFormatado, {
            sintoma: sintomaFormatado,
            quantidade: 1
          })
        }

        processadas++
        
        if (processadas % 10 === 0) {
          console.log(`⏳ Processadas ${processadas}/${chatSessions.length} sessões...`)
        }

        // Pequena pausa
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        console.error(`❌ Erro ao processar threadId ${session.threadId}:`, error)
        continue
      }
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões`)

    // Converte para array e ordena
    const sintomasArray = Array.from(sintomasMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)

    // Adiciona sintomas fixos
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

    // Top 10
    const top10 = sintomasFinais
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    console.log(`📋 Top 10 sintomas:`)
    top10.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade} pesquisas)`)
    })

    const duracao = Date.now() - inicio

    // Salva cache
    const cacheData = {
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: dataAtual,
      periodo: '30 dias'
    }

    saveCache(cacheData)

    console.log('✅ Job concluído com sucesso!')
    console.log(`📊 Sintomas processados: ${processadas}`)
    console.log(`⏱️ Duração: ${duracao}ms`)

    // Salva log
    const logEntry: JobLog = {
      data: dataAtual,
      sucesso: true,
      sintomasProcessados: processadas,
      totalSessoes: processadas,
      duracaoMs: duracao
    }

    saveJobLog(logEntry)

  } catch (error) {
    const duracao = Date.now() - inicio
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    console.error('❌ Job falhou:', errorMessage)

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

function saveCache(cacheData: Record<string, unknown>) {
  try {
    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
    
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))
    console.log('💾 Cache salvo!')
    
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
      const content = import(logsFile)
      logs = Array.isArray(content) ? content : []
    }
    
    logs.push(logEntry)
    
    if (logs.length > 20) {
      logs = logs.slice(-20)
    }
    
    writeFileSync(logsFile, JSON.stringify(logs, null, 2))
    console.log('📝 Log salvo!')
    
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error)
  }
}

// Executa o job
runSymptomsJob()
  .then(() => {
    console.log('🎉 Job concluído!')
    return prisma.$disconnect()
  })
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Job falhou:', error)
    return prisma.$disconnect()
  })
  .then(() => {
    process.exit(1)
  })

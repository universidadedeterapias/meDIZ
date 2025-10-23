// Job semanal para atualizar sintomas populares
// Executa: npm run update-popular-symptoms
// Ou via cron: 0 4 * * 1 (segunda-feira às 04h)

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

async function updatePopularSymptoms() {
  const inicio = Date.now()
  const dataAtual = new Date().toISOString()
  
  console.log('🚀 Iniciando job semanal de atualização de sintomas...')
  console.log(`📅 Data: ${dataAtual}`)
  
  try {
    console.log('🔍 Buscando sessões dos últimos 30 dias...')
    
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
      console.log('⚠️ Nenhuma sessão encontrada, usando sintomas fixos')
      
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
        periodo: '30 dias'
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
      
      console.log('✅ Job concluído com sintomas fixos!')
      return cacheData
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
    console.log(`🔄 Próxima atualização: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}`)

    // Salva log de sucesso
    const logEntry: JobLog = {
      data: dataAtual,
      sucesso: true,
      sintomasProcessados: processadas,
      totalSessoes: processadas,
      duracaoMs: duracao
    }

    saveJobLog(logEntry)

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

function saveCache(cacheData: Record<string, unknown>) {
  try {
    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    // Cria diretório se não existir
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
    
    // Salva cache
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
    
    // Cria diretório se não existir
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true })
    }
    
    // Lê logs existentes
    let logs: JobLog[] = []
    if (existsSync(logsFile)) {
      const content = import(logsFile)
      logs = Array.isArray(content) ? content : []
    }
    
    // Adiciona novo log
    logs.push(logEntry)
    
    // Mantém apenas os últimos 20 logs
    if (logs.length > 20) {
      logs = logs.slice(-20)
    }
    
    // Salva logs
    writeFileSync(logsFile, JSON.stringify(logs, null, 2))
    
    console.log('📝 Log salvo com sucesso')
    
  } catch (error) {
    console.error('❌ Erro ao salvar log:', error)
  }
}

// Executa o job
updatePopularSymptoms()
  .then(() => {
    console.log('🎉 Job semanal concluído!')
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

// Script rápido para testar sintomas dinâmicos (apenas últimas 50 sessões)
// Executa: npm run test-symptoms-quick

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

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

async function testSymptomsQuick() {
  console.log('🧪 Teste rápido de sintomas dinâmicos...')
  
  try {
    // Busca apenas últimas 50 sessões para teste rápido
    const chatSessions = await prisma.chatSession.findMany({
      where: {
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
      },
      take: 50 // Apenas 50 para teste rápido
    })

    console.log(`📈 Testando com ${chatSessions.length} sessões`)

    if (chatSessions.length === 0) {
      console.log('⚠️ Nenhuma sessão encontrada')
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
        console.log(`⏳ Processadas ${processadas}/${chatSessions.length} sessões...`)

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

    console.log(`📋 Top 10 sintomas encontrados:`)
    top10.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade} pesquisas)`)
    })

    // Salva cache de teste
    const cacheData = {
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: new Date().toISOString(),
      periodo: 'Teste rápido (50 sessões)'
    }

    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true })
    }
    
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))

    console.log('💾 Cache de teste salvo!')
    console.log('🎉 Teste concluído com sucesso!')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executa o teste
testSymptomsQuick()
  .then(() => {
    console.log('🏁 Teste finalizado!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })


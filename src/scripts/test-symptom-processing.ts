// Script para testar processamento de sintomas com logs detalhados
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

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

async function testSymptomProcessing() {
  console.log('🔍 Testando processamento de sintomas com logs detalhados...')
  
  try {
    // Busca apenas 3 sessões para teste
    const sessions = await prisma.chatSession.findMany({
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
      take: 3
    })

    console.log(`📈 Testando ${sessions.length} sessões`)

    const sintomasMap = new Map()
    let processadas = 0

    for (const session of sessions) {
      console.log(`\n🔍 Processando sessão ${session.id}:`)
      console.log(`   Thread ID: ${session.threadId}`)
      
      try {
        const messages = await getUserMessages(session.threadId!)
        console.log(`   Mensagens encontradas: ${messages?.length || 0}`)
        
        if (messages && messages.length > 0) {
          const firstMessage = messages[0]
          console.log(`   Primeira mensagem: "${firstMessage}"`)
          console.log(`   Tipo: user message`)
          
          if (firstMessage) {
            const isValid = isValidSymptom(firstMessage)
            console.log(`   É sintoma válido: ${isValid}`)
            
            if (isValid) {
              const sintoma = firstMessage.trim()
              const existing = sintomasMap.get(sintoma)
              sintomasMap.set(sintoma, {
                sintoma,
                quantidade: existing ? existing.quantidade + 1 : 1
              })
              console.log(`   ✅ Sintoma adicionado: ${sintoma}`)
            } else {
              console.log(`   ❌ Sintoma rejeitado: "${firstMessage}"`)
            }
          }
        } else {
          console.log(`   ⚠️ Nenhuma mensagem encontrada`)
        }
        
        processadas++
        
      } catch (error) {
        console.log(`   ❌ Erro ao processar: ${error}`)
      }
    }

    console.log(`\n📊 Resultado:`)
    console.log(`   Sessões processadas: ${processadas}`)
    console.log(`   Sintomas encontrados: ${sintomasMap.size}`)
    
    if (sintomasMap.size > 0) {
      console.log(`   Sintomas:`)
      Array.from(sintomasMap.values()).forEach(sintoma => {
        console.log(`     - ${sintoma.sintoma} (${sintoma.quantidade})`)
      })
    } else {
      console.log(`   ⚠️ Nenhum sintoma válido encontrado`)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSymptomProcessing()

// Teste super rápido - apenas 10 sessões
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

async function testSuperQuick() {
  console.log('🚀 Teste super rápido - 10 sessões apenas...')
  
  try {
    // Busca apenas 10 sessões
    const sessions = await prisma.chatSession.findMany({
      where: { threadId: { not: null } },
      select: { id: true, threadId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    console.log(`📈 Encontradas ${sessions.length} sessões`)

    const sintomas = new Map()
    let processadas = 0

    for (const session of sessions) {
      if (!session.threadId) continue

      try {
        const messages = await getUserMessages(session.threadId)
        const sintoma = messages[0]?.trim()
        
        // Filtros mais rigorosos
        if (sintoma && sintoma.length >= 3 && sintoma.length <= 50) {
          const limpo = sintoma.trim().toLowerCase()
          
          // Remove sintomas com erros óbvios ou muito específicos
          const palavrasInadequadas = [
            'teste', 'testando', 'oi', 'olá', 'hello', 'hi',
            'nada', 'nenhum', 'qualquer', 'coisa', 'algo',
            'problema', 'issue', 'bug', 'erro', 'falha',
            'sinto', 'estou', 'tenho', 'meu', 'minha'
          ]
          
          // Verifica se contém palavras inadequadas
          const temPalavraInadequada = palavrasInadequadas.some(palavra => 
            limpo.includes(palavra)
          )
          
          if (temPalavraInadequada) {
            console.log(`   ❌ Filtrado: "${sintoma}" (palavra inadequada)`)
            continue
          }
          
          // Aceita apenas sintomas com 1 palavra OU sintomas conhecidos
          const palavras = limpo.split(' ')
          
          if (palavras.length === 1) {
            // Sintoma de 1 palavra - aceita
            const formatado = sintoma.charAt(0).toUpperCase() + sintoma.slice(1).toLowerCase()
            
            if (sintomas.has(formatado)) {
              sintomas.set(formatado, sintomas.get(formatado) + 1)
            } else {
              sintomas.set(formatado, 1)
            }
          } else {
            // Sintoma com múltiplas palavras - só aceita se for conhecido
            const sintomasConhecidos = [
              'dor de cabeça', 'dor nas costas', 'dor no joelho',
              'dor no peito', 'dor de garganta', 'dor de estômago',
              'pressão alta', 'pressão baixa', 'glicose alta',
              'colesterol alto', 'febre alta', 'tosse seca',
              'dor no ciático', 'pensamento negativo', 'pensamento acelerado'
            ]
            
            if (sintomasConhecidos.includes(limpo)) {
              const formatado = sintoma.split(' ')
                .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase())
                .join(' ')
              
              if (sintomas.has(formatado)) {
                sintomas.set(formatado, sintomas.get(formatado) + 1)
              } else {
                sintomas.set(formatado, 1)
              }
            } else {
              console.log(`   ❌ Filtrado: "${sintoma}" (múltiplas palavras não conhecidas)`)
            }
          }
        }

        processadas++
        console.log(`⏳ ${processadas}/10 - "${sintoma}"`)

      } catch (error) {
        console.log(`❌ Erro na sessão ${session.threadId}`)
      }
    }

    // Converte para array e ordena
    const topSintomas = Array.from(sintomas.entries())
      .map(([sintoma, quantidade]) => ({ sintoma, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10)

    console.log('\n📋 Top sintomas encontrados:')
    topSintomas.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade}x)`)
    })

    // Salva cache
    const cacheData = {
      sintomas: topSintomas,
      totalProcessados: processadas,
      ultimaAtualizacao: new Date().toISOString(),
      periodo: 'Teste rápido (10 sessões)'
    }

    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))

    console.log('\n✅ Cache atualizado!')
    console.log('🎉 Agora acesse a página de chat para ver os sintomas dinâmicos!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSuperQuick()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

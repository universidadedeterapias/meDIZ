// Busca sintomas realmente populares (mais dados)
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'

async function buscarSintomasPopulares() {
  console.log('🔍 Buscando sintomas realmente populares...')
  
  try {
    // Busca mais sessões para ter dados representativos
    const sessions = await prisma.chatSession.findMany({
      where: { threadId: { not: null } },
      select: { id: true, threadId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200 // Mais dados para ter sintomas realmente populares
    })

    console.log(`📈 Analisando ${sessions.length} sessões`)

    const sintomas = new Map()
    let processadas = 0
    let filtradas = 0

    for (const session of sessions) {
      if (!session.threadId) continue

      try {
        const messages = await getUserMessages(session.threadId)
        const sintoma = messages[0]?.trim()
        
        if (sintoma && sintoma.length >= 3 && sintoma.length <= 50) {
          const limpo = sintoma.trim().toLowerCase()
          
          // Filtros rigorosos
          const palavrasInadequadas = [
            'teste', 'testando', 'oi', 'olá', 'hello', 'hi',
            'nada', 'nenhum', 'qualquer', 'coisa', 'algo',
            'problema', 'issue', 'bug', 'erro', 'falha',
            'sinto', 'estou', 'tenho', 'meu', 'minha', 'sentindo'
          ]
          
          const temPalavraInadequada = palavrasInadequadas.some(palavra => 
            limpo.includes(palavra)
          )
          
          if (temPalavraInadequada) {
            filtradas++
            continue
          }
          
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
              filtradas++
            }
          }
        }

        processadas++
        
        if (processadas % 50 === 0) {
          console.log(`⏳ Processadas ${processadas}/${sessions.length} sessões...`)
        }

        // Pequena pausa
        await new Promise(resolve => setTimeout(resolve, 20))

      } catch {
        console.log(`❌ Erro na sessão ${session.threadId}`)
      }
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões`)
    console.log(`🚫 Sintomas filtrados: ${filtradas}`)

    // Converte para array e ordena
    const topSintomas = Array.from(sintomas.entries())
      .map(([sintoma, quantidade]) => ({ sintoma, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)

    console.log('\n📋 Todos os sintomas encontrados:')
    topSintomas.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade}x)`)
    })

    // Se não há sintomas suficientes, adiciona sintomas fixos
    const sintomasFinais = [...topSintomas]
    
    const sintomasFixos = [
      'Dor de cabeça', 'Dor nas costas', 'Ansiedade', 'Cansaço', 'Insônia'
    ]
    
    sintomasFixos.forEach(sintomaFixo => {
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

    console.log('\n🎯 Top 10 sintomas finais:')
    top10.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.sintoma} (${s.quantidade}x)`)
    })

    // Salva cache
    const cacheData = {
      sintomas: top10,
      totalProcessados: processadas,
      ultimaAtualizacao: new Date().toISOString(),
      periodo: 'Análise completa (200 sessões)'
    }

    const cacheDir = join(process.cwd(), 'cache')
    const cacheFile = join(cacheDir, 'sintomas-populares.json')
    
    if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
    writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2))

    console.log('\n✅ Cache atualizado com sintomas realmente populares!')
    console.log('🎉 Agora acesse a página de chat!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

buscarSintomasPopulares()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))

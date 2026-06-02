// Script para extrair sintomas mais pesquisados (TESTE RÁPIDO - 100 sessões)
// Executa: npx tsx src/scripts/export-sintomas-quick.ts

import { prisma } from '../lib/prisma'
import { getUserMessages } from '../lib/assistant'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface SintomaData {
  sintoma: string
  quantidade: number
  primeiraPesquisa: Date
  ultimaPesquisa: Date
  threadIds: string[]
}

async function exportarSintomasQuick() {
  console.log('🔍 Iniciando extração de sintomas mais pesquisados (TESTE RÁPIDO)...')
  
  try {
    // 1. Busca apenas as últimas 100 sessões para teste muito rápido
    console.log('📊 Buscando últimas 100 sessões de chat...')
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        threadId: {
          not: null
        }
      },
      select: {
        id: true,
        threadId: true,
        createdAt: true,
        userId: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Apenas 100 para teste rápido
    })

    console.log(`📈 Encontradas ${chatSessions.length} sessões com threadId`)

    if (chatSessions.length === 0) {
      console.log('❌ Nenhuma sessão encontrada')
      return
    }

    // 2. Agrupa por threadId (cada threadId = um sintoma único)
    const sintomasMap = new Map<string, SintomaData>()
    let processadas = 0
    const total = chatSessions.length

    console.log('🔄 Processando mensagens dos usuários...')

    for (const session of chatSessions) {
      if (!session.threadId) continue

      try {
        // Recupera a mensagem original do usuário
        const userMessages = await getUserMessages(session.threadId)
        const sintoma = userMessages[0] || 'Mensagem não encontrada'

        // Atualiza ou cria entrada no mapa
        if (sintomasMap.has(sintoma)) {
          const existing = sintomasMap.get(sintoma)!
          existing.quantidade++
          existing.ultimaPesquisa = session.createdAt
          existing.threadIds.push(session.threadId)
          
          // Atualiza primeira pesquisa se for mais antiga
          if (session.createdAt < existing.primeiraPesquisa) {
            existing.primeiraPesquisa = session.createdAt
          }
        } else {
          sintomasMap.set(sintoma, {
            sintoma,
            quantidade: 1,
            primeiraPesquisa: session.createdAt,
            ultimaPesquisa: session.createdAt,
            threadIds: [session.threadId]
          })
        }

        processadas++
        console.log(`⏳ Processadas ${processadas}/${total} sessões...`)

        // Pequena pausa para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Erro ao processar threadId ${session.threadId}:`, error)
        continue
      }
    }

    console.log(`✅ Processamento concluído: ${processadas} sessões`)

    // 3. Converte para array e ordena por quantidade
    const sintomasArray = Array.from(sintomasMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)

    console.log(`📋 Encontrados ${sintomasArray.length} sintomas únicos`)

    // 4. Gera CSV
    const csvHeader = 'Sintoma Pesquisado,Quantidade de Pesquisas,Data da Primeira Pesquisa,Data da Última Pesquisa\n'
    
    const csvRows = sintomasArray.map(sintoma => {
      const sintomaEscaped = `"${sintoma.sintoma.replace(/"/g, '""')}"`
      const primeiraData = sintoma.primeiraPesquisa.toLocaleDateString('pt-BR')
      const ultimaData = sintoma.ultimaPesquisa.toLocaleDateString('pt-BR')
      
      return `${sintomaEscaped},${sintoma.quantidade},${primeiraData},${ultimaData}`
    }).join('\n')

    const csvContent = csvHeader + csvRows

    // 5. Salva arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `sintomas-pesquisados-QUICK-${timestamp}.csv`
    const filepath = join(process.cwd(), 'exports', filename)

    // Cria diretório se não existir
    const fs = await import('fs')
    const path = await import('path')
    const exportDir = path.join(process.cwd(), 'exports')
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true })
    }

    writeFileSync(filepath, csvContent, 'utf-8')

    console.log(`📁 Planilha salva em: ${filepath}`)
    console.log(`📊 Resumo:`)
    console.log(`   - Total de sintomas únicos: ${sintomasArray.length}`)
    console.log(`   - Total de pesquisas: ${sintomasArray.reduce((sum, s) => sum + s.quantidade, 0)}`)
    console.log(`   - Sintoma mais pesquisado: "${sintomasArray[0]?.sintoma}" (${sintomasArray[0]?.quantidade} vezes)`)

    // 6. Mostra top 10
    console.log(`\n🏆 Top 10 sintomas mais pesquisados:`)
    sintomasArray.slice(0, 10).forEach((sintoma, index) => {
      console.log(`   ${index + 1}. "${sintoma.sintoma}" - ${sintoma.quantidade} pesquisas`)
    })

  } catch (error) {
    console.error('❌ Erro durante a execução:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executa o script
exportarSintomasQuick()
  .then(() => {
    console.log('🎉 Script concluído com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })


// API para métricas de sintomas (admin)
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

<<<<<<< HEAD
=======
// Sintomas fixos como fallback
const SINTOMAS_FALLBACK = [
  { sintoma: 'Dor de cabeça', quantidade: 1 },
  { sintoma: 'Dor nas costas', quantidade: 1 },
  { sintoma: 'Ansiedade', quantidade: 1 },
  { sintoma: 'Cansaço', quantidade: 1 },
  { sintoma: 'Insônia', quantidade: 1 },
  { sintoma: 'Enxaqueca', quantidade: 1 },
  { sintoma: 'Rinite', quantidade: 1 },
  { sintoma: 'Dor no joelho', quantidade: 1 },
  { sintoma: 'Estresse', quantidade: 1 },
  { sintoma: 'Pressão alta', quantidade: 1 }
]

>>>>>>> feature/pdf-export-and-growth
export async function GET() {
  try {
    // Verifica se é admin
    const session = await auth()
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Carrega logs do job
    const logsFile = join(process.cwd(), 'logs', 'sintomas-job-logs.json')
    let logs = []
    
    if (existsSync(logsFile)) {
      try {
        logs = JSON.parse(readFileSync(logsFile, 'utf-8'))
      } catch (error) {
        console.error('Erro ao ler logs:', error)
      }
    }

    // Carrega dados do cache
    const cacheFile = join(process.cwd(), 'cache', 'sintomas-populares.json')
    let cacheData = null
    
    if (existsSync(cacheFile)) {
      try {
        cacheData = JSON.parse(readFileSync(cacheFile, 'utf-8'))
      } catch (error) {
        console.error('Erro ao ler cache:', error)
      }
    }

<<<<<<< HEAD
=======
    // Se não há cache, cria um fallback
    if (!cacheData) {
      console.log('⚠️ Cache não encontrado, criando fallback...')
      cacheData = {
        sintomas: SINTOMAS_FALLBACK,
        totalProcessados: 0,
        ultimaAtualizacao: new Date().toISOString(),
        periodo: 'Sintomas fixos (fallback)',
        isFallback: true
      }
    }

>>>>>>> feature/pdf-export-and-growth
    return NextResponse.json({
      success: true,
      logs: logs.reverse(), // Mais recentes primeiro
      cacheData,
      totalLogs: logs.length,
<<<<<<< HEAD
      hasCache: !!cacheData
=======
      hasCache: !!cacheData && !cacheData.isFallback,
      isFallback: cacheData.isFallback || false
>>>>>>> feature/pdf-export-and-growth
    })

  } catch (error) {
    console.error('Erro ao carregar métricas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


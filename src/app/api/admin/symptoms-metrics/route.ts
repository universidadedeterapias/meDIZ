// API para métricas de sintomas (admin)
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

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

    return NextResponse.json({
      success: true,
      logs: logs.reverse(), // Mais recentes primeiro
      cacheData,
      totalLogs: logs.length,
      hasCache: !!cacheData
    })

  } catch (error) {
    console.error('Erro ao carregar métricas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


// src/app/api/admin/log-rotation/route.ts
// API para rotação de logs (pode ser chamada por cron job)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { rotateAllLogs, getLogStats } from '@/lib/logRotation'
import { logInfo } from '@/lib/logger'

export async function POST(_req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const stats = await getLogStats()
    const result = await rotateAllLogs()

    logInfo('Log rotation executado', 'LogRotation', {
      deleted: result,
      stats
    })

    return NextResponse.json({
      success: true,
      deleted: result,
      stats
    })

  } catch {
    return NextResponse.json({ 
      error: 'Erro ao executar rotação de logs' 
    }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const stats = await getLogStats()

    return NextResponse.json({
      success: true,
      stats
    })

  } catch {
    return NextResponse.json({ 
      error: 'Erro ao obter estatísticas de logs' 
    }, { status: 500 })
  }
}


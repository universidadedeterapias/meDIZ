/**
 * Endpoint para processar fila de lembretes
 * 
 * Este endpoint é chamado pelo Vercel Cron para processar jobs da fila
 * Pode também ser chamado manualmente por admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { reminderWorker } from '@/lib/workers/reminder-worker'
import { getQueueStats } from '@/lib/queues/reminders-queue'

export const runtime = 'nodejs'
export const maxDuration = 600 // 10 minutos

export async function GET(_req: NextRequest) {
  try {
    // Verificar se worker está disponível
    if (!reminderWorker) {
      return NextResponse.json(
        { error: 'Worker não disponível. Redis pode não estar configurado.' },
        { status: 503 }
      )
    }

    // Obter estatísticas da fila
    const stats = await getQueueStats()

    return NextResponse.json({
      success: true,
      message: 'Worker está processando jobs da fila',
      stats: stats || {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[CheckRemindersQueue] Erro:', errorMessage)
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

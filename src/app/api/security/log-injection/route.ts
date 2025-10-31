/**
 * 🔒 API Route para Processar Alertas de Injeção
 * 
 * Esta rota é chamada de forma assíncrona pelo middleware quando uma injeção é detectada.
 * Ela roda no Node.js runtime (não Edge), permitindo uso do Prisma.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processInjectionDetection } from '@/lib/security/injection-alert-service'
import type { InjectionDetectionResult } from '@/lib/security/injection-detector'

export const runtime = 'nodejs' // Força Node.js runtime (não Edge)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const {
      detection,
      endpoint,
      method,
      ipAddress,
      userAgent,
      userId
    } = body
    
    // Validar dados obrigatórios
    if (!detection || !endpoint || !method) {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }
    
    // Criar requisição mock para processar
    const mockReq = new NextRequest('http://localhost:3000' + endpoint, {
      method,
      headers: {
        'x-forwarded-for': ipAddress || 'unknown',
        'user-agent': userAgent || 'unknown'
      }
    })
    
    // Processar alerta
    const result = await processInjectionDetection(
      detection as InjectionDetectionResult,
      mockReq,
      endpoint,
      userId
    )
    
    return NextResponse.json({
      success: true,
      attemptId: result.attemptId,
      alertSent: result.alertSent
    })
  } catch (error) {
    console.error('[LogInjection API] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: 'Erro ao processar alerta', message },
      { status: 500 }
    )
  }
}


/**
 * 🔧 Helper para usar detecção de injeção em rotas API
 * 
 * Use este helper nas rotas API para analisar o body após já ter sido lido
 */

import { detectInjection } from './injection-detector'
import { processInjectionDetection } from './injection-alert-service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Analisa dados já parseados de uma rota API para detectar injeções
 * 
 * Use isso dentro das rotas API após ler o body:
 * 
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const body = await req.json()
 *   
 *   // Analisar antes de processar
 *   const detection = await analyzeRouteData(req, '/api/user/form', body)
 *   if (detection) {
 *     return detection // Retorna resposta 403
 *   }
 *   
 *   // Continuar processamento normal...
 * }
 * ```
 */
export async function analyzeRouteData(
  req: NextRequest,
  endpoint: string,
  body: unknown,
  userId?: string
): Promise<NextResponse | null> {
  try {
    // Extrair query params
    const queryParams: Record<string, unknown> = {}
    req.nextUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })
    
    // Extrair headers
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })
    
    // Executar detecção
    const detections = detectInjection({
      query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      body,
      headers,
      path: endpoint
    })
    
    // Se não houver detecção, retornar null (continua processamento)
    if (detections.length === 0) {
      return null
    }
    
    // Detecção encontrada
    const primaryDetection = detections[0]
    
    // Disparar alerta
    try {
      await processInjectionDetection(
        primaryDetection,
        req,
        endpoint,
        userId
      )
    } catch (error) {
      console.error('[InjectionRouteHelper] Erro ao processar alerta:', error)
    }
    
    // 🚫 BLOQUEIO DESATIVADO: Apenas logar sem bloquear
    // Para reativar bloqueio, defina SECURITY_ENABLE_BLOCK=true no .env
    const ENABLE_BLOCK = process.env.SECURITY_ENABLE_BLOCK === 'true'
    
    if (ENABLE_BLOCK) {
      // Bloquear requisição apenas se explicitamente habilitado
      return NextResponse.json(
        {
          error: 'Requisição bloqueada por segurança',
          message: 'Padrão malicioso detectado na requisição',
          code: 'SECURITY_BLOCKED'
        },
        { status: 403 }
      )
    }
    
    // Por padrão, apenas logar mas não bloquear
    console.warn(`[InjectionRouteHelper] 🔍 Detecção registrada (sem bloqueio):`, {
      type: primaryDetection.type,
      pattern: primaryDetection.pattern,
      endpoint,
      field: primaryDetection.details.field
    })
    
    return null
  } catch (error) {
    console.error('[InjectionRouteHelper] Erro:', error)
    return null // Fail open
  }
}


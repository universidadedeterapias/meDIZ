/**
 * 🛡️ Middleware de Segurança - Detecção de Injeção
 * 
 * Este middleware detecta SQL Injection e Command Injection em requisições HTTP
 * e bloqueia requisições maliciosas antes que alcancem as rotas da API.
 * 
 * IMPORTANTE: Este middleware deve ser importado e usado no middleware.ts principal
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { detectInjection } from '@/lib/security/injection-detector'

/**
 * Middleware de segurança para detectar injeções
 * 
 * @param req - Requisição HTTP
 * @param endpoint - Endpoint sendo acessado
 * @returns null se não houver detecção, ou NextResponse com erro 403 se detectado
 */
export async function securityMiddleware(
  req: NextRequest,
  endpoint: string
): Promise<NextResponse | null> {
  // Aplicar apenas em rotas da API
  if (!endpoint.startsWith('/api/')) {
    return null
  }
  
  // Ignorar rotas de webhook (Hotmart, Stripe) e rotas internas de segurança
  const ignoredRoutes = [
    '/api/hotmart',
    '/api/stripe',
    '/api/webhooks',
    '/api/security/log-injection' // Evita loop - esta rota processa alertas
  ]
  
  if (ignoredRoutes.some(route => endpoint.startsWith(route))) {
    return null
  }
  
  try {
    // Extrair dados da requisição
    const url = req.nextUrl
    const queryParams: Record<string, unknown> = {}
    
    // Extrair query parameters
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value
    })
    
    // Extrair body (apenas para POST, PUT, PATCH)
    // Nota: Em Next.js, não podemos ler o body no middleware sem consumi-lo
    // Por isso, vamos apenas analisar query params e headers no middleware
    // O body será analisado nas rotas API individuais usando um helper
    const body: unknown = null
    
    // Por enquanto, não lemos o body no middleware para evitar consumir o stream
    // A análise do body será feita nas rotas API usando o helper detectInjectionInRoute
    
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
    
    // Se não houver detecção, continuar normalmente
    if (detections.length === 0) {
      return null
    }
    
    // Detecção encontrada - processar alerta de forma assíncrona
    const primaryDetection = detections[0]
    
    // Extrair informações da requisição
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                      req.headers.get('x-real-ip') || 
                      req.headers.get('cf-connecting-ip') ||
                      'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    // Log da detecção
    console.warn(`[SecurityMiddleware] 🚨 INJEÇÃO DETECTADA:`, {
      type: primaryDetection.type,
      severity: primaryDetection.severity,
      pattern: primaryDetection.pattern,
      endpoint,
      method: req.method,
      ipAddress
    })
    
    // Enviar alerta de forma assíncrona (não bloqueia resposta)
    // Usar fetch para chamar API route que roda no Node.js runtime
    const baseUrl = req.nextUrl.origin
    
    // 🚫 BLOQUEIO DESATIVADO: Apenas logar sem bloquear
    // Para reativar bloqueio, defina SECURITY_ENABLE_BLOCK=true no .env
    const ENABLE_BLOCK = process.env.SECURITY_ENABLE_BLOCK === 'true'
    
    // Sempre logar detecções (para análise)
    fetch(`${baseUrl}/api/security/log-injection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detection: primaryDetection,
        endpoint,
        method: req.method,
        ipAddress,
        userAgent,
        userId: undefined // Middleware não tem acesso fácil ao userId
      })
    }).catch(error => {
      // Log erro mas não falha a requisição
      console.error('[SecurityMiddleware] Erro ao enviar alerta assíncrono:', error)
    })
    
    // Log da detecção (sempre acontece)
    console.warn(`[SecurityMiddleware] 🔍 Detecção registrada (sem bloqueio):`, {
      type: primaryDetection.type,
      pattern: primaryDetection.pattern,
      severity: primaryDetection.severity,
      endpoint,
      value: primaryDetection.details.value?.substring(0, 50)
    })
    
    // Bloquear apenas se explicitamente habilitado
    if (ENABLE_BLOCK) {
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
    return null
  } catch (error) {
    console.error('[SecurityMiddleware] Erro no middleware de segurança:', error)
    // Em caso de erro, não bloquear (fail open)
    return null
  }
}


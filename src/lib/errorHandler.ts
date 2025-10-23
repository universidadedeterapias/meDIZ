// src/lib/errorHandler.ts

import { NextResponse } from 'next/server'

/**
 * Trata erros de forma consistente e retorna respostas apropriadas
 */
export function handleApiError(error: unknown, context: string = 'API'): NextResponse {
  console.error(`[${context}] Erro detalhado:`, error)
  
  if (error instanceof Error) {
    console.error(`[${context}] Stack trace:`, error.stack)
    console.error(`[${context}] Mensagem do erro:`, error.message)
    
    // Erro de conexão com banco de dados
    if (error.message.includes('connect') || 
        error.message.includes('database') || 
        error.message.includes('connection') ||
        error.message.includes('prisma')) {
      return NextResponse.json({ 
        error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
      }, { status: 503 })
    }
    
    // Erro de timeout
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return NextResponse.json({ 
        error: 'A operação demorou mais que o esperado. Tente novamente.'
      }, { status: 408 })
    }
    
    // Erro de validação de dados
    if (error.message.includes('validation') || 
        error.message.includes('invalid') ||
        error.message.includes('required')) {
      return NextResponse.json({ 
        error: 'Dados inválidos fornecidos. Verifique as informações e tente novamente.'
      }, { status: 400 })
    }
    
    // Erro de WhatsApp/API externa
    if (error.message.includes('whatsapp') || 
        error.message.includes('z-api') ||
        error.message.includes('cloudinary') ||
        error.message.includes('stripe')) {
      return NextResponse.json({ 
        error: 'Serviço externo temporariamente indisponível. Tente novamente em alguns minutos.'
      }, { status: 503 })
    }
    
    // Erro de autenticação/autorização
    if (error.message.includes('unauthorized') || 
        error.message.includes('forbidden') ||
        error.message.includes('auth')) {
      return NextResponse.json({ 
        error: 'Acesso não autorizado. Faça login novamente.'
      }, { status: 401 })
    }
    
    // Erro de recurso não encontrado
    if (error.message.includes('not found') || 
        error.message.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Recurso não encontrado.'
      }, { status: 404 })
    }
  }
  
  // Para erros não identificados, retornar mensagem mais amigável
  return NextResponse.json({ 
    error: 'Não foi possível processar sua solicitação. Tente novamente ou entre em contato conosco se o problema persistir.'
  }, { status: 500 })
}

/**
 * Wrapper para funções de API que adiciona tratamento de erro automático
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context: string = 'API'
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      throw handleApiError(error, context)
    }
  }
}

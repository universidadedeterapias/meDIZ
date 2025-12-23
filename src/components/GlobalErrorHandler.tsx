'use client'

import { useEffect } from 'react'

/**
 * Componente que adiciona handlers globais de erro para evitar
 * que objetos Event sejam logados incorretamente como "[object Event]"
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    // Handler para erros não capturados
    const handleError = (event: ErrorEvent | Event) => {
      try {
        // Previne o log padrão do browser que pode mostrar "[object Event]"
        if (event.preventDefault) {
          event.preventDefault()
        }
        
        // Loga o erro de forma adequada
        const errorInfo: Record<string, unknown> = {
          message: 'error' in event ? (event.message || 'Erro desconhecido') : 'Erro desconhecido',
          filename: 'filename' in event ? (event.filename || 'unknown') : 'unknown',
          lineno: 'lineno' in event ? (event.lineno || 0) : 0,
          colno: 'colno' in event ? (event.colno || 0) : 0
        }

        if ('error' in event && event.error) {
          if (event.error instanceof Error) {
            errorInfo.error = {
              name: event.error.name,
              message: event.error.message,
              stack: event.error.stack
            }
          } else {
            errorInfo.error = String(event.error)
          }
        }

        console.error('[GlobalErrorHandler] Erro capturado:', errorInfo)
      } catch (err) {
        // Fallback caso haja erro no próprio handler
        console.error('[GlobalErrorHandler] Erro ao processar erro:', err)
      }
    }

    // Handler para promises rejeitadas não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent | Event) => {
      try {
        // Previne o log padrão
        if (event.preventDefault) {
          event.preventDefault()
        }
        
        // Loga a rejeição de forma adequada
        const rejectionInfo: Record<string, unknown> = {}

        if ('reason' in event && event.reason) {
          if (event.reason instanceof Error) {
            rejectionInfo.error = {
              name: event.reason.name,
              message: event.reason.message,
              stack: event.reason.stack
            }
          } else if (event.reason && typeof event.reason === 'object') {
            // Pode ser um objeto Event ou outro tipo
            rejectionInfo.reason = String(event.reason)
            rejectionInfo.reasonType = event.reason.constructor?.name || 'Unknown'
          } else {
            rejectionInfo.reason = event.reason
          }
        }

        console.error('[GlobalErrorHandler] Promise rejeitada:', rejectionInfo)
      } catch (err) {
        // Fallback caso haja erro no próprio handler
        console.error('[GlobalErrorHandler] Erro ao processar rejeição:', err)
      }
    }

    // Interceptar console.error para evitar logs de "[object Event]"
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      const processedArgs = args.map(arg => {
        if (arg && typeof arg === 'object' && arg.constructor?.name === 'Event') {
          return `[Event: ${(arg as Event).type || 'Unknown'}]`
        }
        return arg
      })
      originalConsoleError.apply(console, processedArgs)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      // Restaurar console.error original
      console.error = originalConsoleError
    }
  }, [])

  return null
}


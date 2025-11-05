// src/lib/logger.ts
// Sistema de log estruturado para substituir console.log

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 1000

  private formatEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level}]`,
      entry.context ? `[${entry.context}]` : '',
      entry.message,
      entry.data ? JSON.stringify(entry.data) : '',
      entry.error ? `Error: ${entry.error.name} - ${entry.error.message}` : ''
    ].filter(Boolean)
    
    return parts.join(' ')
  }

  private async writeLog(entry: LogEntry) {
    // Em produção, você pode enviar para serviço externo (Datadog, CloudWatch, etc.)
    // Por enquanto, apenas adiciona ao buffer
    
    if (this.logBuffer.length >= this.maxBufferSize) {
      // Remove entradas antigas (FIFO)
      this.logBuffer.shift()
    }
    
    this.logBuffer.push(entry)
    
    // Em desenvolvimento, ainda mostra no console
    if (this.isDevelopment) {
      const formatted = this.formatEntry(entry)
      const consoleMethod = entry.level === LogLevel.ERROR ? console.error :
                           entry.level === LogLevel.WARN ? console.warn :
                           entry.level === LogLevel.DEBUG ? console.debug :
                           console.log
      
      consoleMethod(formatted)
    }
    
    // Em produção, você pode:
    // - Enviar para serviço de logging (Datadog, Sentry, etc.)
    // - Salvar em arquivo
    // - Enviar para banco de dados
  }

  debug(message: string, context?: string, data?: Record<string, unknown>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      message,
      context,
      data
    })
  }

  info(message: string, context?: string, data?: Record<string, unknown>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      message,
      context,
      data
    })
  }

  warn(message: string, context?: string, data?: Record<string, unknown>) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      message,
      context,
      data
    })
  }

  error(
    message: string, 
    error?: Error, 
    context?: string, 
    data?: Record<string, unknown>
  ) {
    this.writeLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    })
  }

  /**
   * Retorna os logs recentes (útil para debug)
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count)
  }

  /**
   * Limpa o buffer de logs
   */
  clearBuffer() {
    this.logBuffer = []
  }
}

// Singleton
export const logger = new Logger()

/**
 * Helpers para facilitar uso
 */
export function logDebug(message: string, context?: string, data?: Record<string, unknown>) {
  logger.debug(message, context, data)
}

export function logInfo(message: string, context?: string, data?: Record<string, unknown>) {
  logger.info(message, context, data)
}

export function logWarn(message: string, context?: string, data?: Record<string, unknown>) {
  logger.warn(message, context, data)
}

export function logError(
  message: string, 
  error?: Error, 
  context?: string, 
  data?: Record<string, unknown>
) {
  logger.error(message, error, context, data)
}

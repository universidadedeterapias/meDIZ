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
 * Mascara informações sensíveis em strings e objetos
 */
export function maskSensitiveData(value: unknown): unknown {
  if (typeof value === 'string') {
    // Mascarar chaves VAPID (geralmente 87 caracteres base64url)
    if (value.length > 60 && /^[A-Za-z0-9_-]+$/.test(value)) {
      return value.substring(0, 8) + '...' + value.substring(value.length - 4)
    }
    // Mascarar secrets/tokens (geralmente longos)
    if (value.length > 32) {
      return value.substring(0, 4) + '***' + value.substring(value.length - 4)
    }
    // Mascarar emails parcialmente
    if (value.includes('@')) {
      const [local, domain] = value.split('@')
      if (local && domain) {
        return local.substring(0, 2) + '***@' + domain
      }
    }
    return value
  }
  
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(maskSensitiveData)
    }
    
    const masked: Record<string, unknown> = {}
    const sensitiveKeys = [
      'secret', 'key', 'token', 'password', 'vapid', 'private', 
      'publicKey', 'privateKey', 'auth', 'p256dh', 'endpoint',
      'cronSecret', 'nextAuthSecret', 'stripeSecret', 'googleSecret'
    ]
    
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk))
      
      if (isSensitive && typeof val === 'string' && val.length > 10) {
        masked[key] = maskSensitiveData(val)
      } else {
        masked[key] = maskSensitiveData(val)
      }
    }
    
    return masked
  }
  
  return value
}

/**
 * Helpers para facilitar uso
 */
export function logDebug(message: string, context?: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) as Record<string, unknown> : undefined
  logger.debug(message, context, maskedData)
}

export function logInfo(message: string, context?: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) as Record<string, unknown> : undefined
  logger.info(message, context, maskedData)
}

export function logWarn(message: string, context?: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) as Record<string, unknown> : undefined
  logger.warn(message, context, maskedData)
}

export function logError(
  message: string, 
  error?: Error, 
  context?: string, 
  data?: Record<string, unknown>
) {
  const maskedData = data ? maskSensitiveData(data) as Record<string, unknown> : undefined
  logger.error(message, error, context, maskedData)
}

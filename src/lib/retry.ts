// src/lib/retry.ts
// Utilitário de retry com exponential backoff e circuit breaker

export interface RetryOptions {
  /** Número máximo de tentativas (default: 3) */
  maxAttempts?: number
  /** Tempo inicial de espera em ms (default: 1000) */
  initialDelay?: number
  /** Multiplicador para exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Delay máximo em ms (default: 10000) */
  maxDelay?: number
  /** Função para determinar se deve tentar novamente baseado no erro */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Função para log (opcional) */
  onRetry?: (error: unknown, attempt: number, delay: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000
}

/**
 * Executa uma função com retry automático usando exponential backoff
 * 
 * @param fn Função assíncrona a ser executada
 * @param options Opções de retry
 * @returns Resultado da função
 * @throws Último erro se todas as tentativas falharem
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    shouldRetry: options.shouldRetry || (() => true) // Por padrão, sempre tenta novamente
  }

  let lastError: unknown
  let delay = opts.initialDelay

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Verificar se deve tentar novamente
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error
      }

      // Calcular delay com exponential backoff
      delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      )

      // Log do retry (se fornecido)
      if (opts.onRetry) {
        opts.onRetry(error, attempt, delay)
      } else if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Retry] Tentativa ${attempt}/${opts.maxAttempts} falhou, tentando novamente em ${delay}ms:`,
          error instanceof Error ? error.message : error
        )
      }

      // Aguardar antes da próxima tentativa
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // Nunca deve chegar aqui, mas TypeScript precisa disso
  throw lastError
}

/**
 * Circuit breaker simples para evitar chamadas repetidas a serviços que estão falhando
 */
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeout = 60000 // 1 minuto
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Verificar se deve tentar novamente (half-open)
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker está aberto - serviço indisponível')
      }
    }

    try {
      const result = await fn()
      // Sucesso - resetar contador
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      } else {
        this.failures = 0
      }
      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      if (this.failures >= this.failureThreshold) {
        this.state = 'open'
      }

      throw error
    }
  }

  getState() {
    return this.state
  }

  reset() {
    this.failures = 0
    this.state = 'closed'
    this.lastFailureTime = 0
  }
}

// Circuit breakers por serviço
const circuitBreakers = new Map<string, CircuitBreaker>()

/**
 * Obtém ou cria um circuit breaker para um serviço específico
 */
function getCircuitBreaker(serviceName: string): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker())
  }
  return circuitBreakers.get(serviceName)!
}

/**
 * Executa uma função com retry e circuit breaker
 * 
 * @param serviceName Nome do serviço (para circuit breaker)
 * @param fn Função a ser executada
 * @param options Opções de retry
 * @returns Resultado da função
 */
export async function withRetryAndCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const breaker = getCircuitBreaker(serviceName)

  return breaker.execute(() => withRetry(fn, options))
}

/**
 * Verifica se um erro é retryable (pode ser tentado novamente)
 * Erros de rede, timeouts e 5xx são geralmente retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Erros de rede
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNRESET')
    ) {
      return true
    }

    // Timeouts
    if (error.message.includes('timeout') || error.name === 'TimeoutError') {
      return true
    }
  }

  // Se for uma Response do fetch, verificar status code
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    // 5xx são retryable, 429 (rate limit) também
    return status >= 500 || status === 429
  }

  return false
}

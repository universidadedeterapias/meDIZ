/**
 * 🛡️ Detector de SQL Injection e Command Injection
 * 
 * Detecta padrões maliciosos em dados de entrada do usuário
 * que podem ser interpretados como comandos SQL ou do sistema operacional.
 */

export type InjectionType = 'SQL_INJECTION' | 'COMMAND_INJECTION'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type Location = 'query' | 'body' | 'headers' | 'path'

export interface InjectionDetectionResult {
  detected: boolean
  type?: InjectionType
  pattern?: string
  location?: Location
  severity: Severity
  details: {
    field?: string
    value?: string
    matchedPattern?: string
  }
}

/**
 * Padrões de SQL Injection
 * Baseado em OWASP e padrões comuns de ataques
 */
const SQL_INJECTION_PATTERNS = [
  // Comment injection - MAIS ESPECÍFICO: precisa estar isolado ou no início/fim
  { pattern: /^--|\s--|^#\s|^\/\*|\*\/$|\/\*[\s\S]*\*\//i, severity: 'medium' as Severity, name: 'SQL Comment' },
  
  // Union-based attacks
  { pattern: /union[\s]+select/i, severity: 'high' as Severity, name: 'Union Select' },
  { pattern: /union[\s]+all[\s]+select/i, severity: 'high' as Severity, name: 'Union All Select' },
  
  // Boolean-based blind
  { pattern: /('|"|;|`)[\s]*(or|and)[\s]+[\d\w]+[\s]*=[\s]*[\d\w]+/i, severity: 'high' as Severity, name: 'Boolean Logic' },
  { pattern: /('|"|;|`)[\s]*(or|and)[\s]+[\d\w]+[\s]*like[\s]+['"]/i, severity: 'high' as Severity, name: 'Like Operator' },
  { pattern: /('|"|;|`)[\s]*(or|and)[\s]+['"]1['"][\s]*=[\s]*['"]1['"]/i, severity: 'high' as Severity, name: 'Always True' },
  
  // Time-based attacks
  { pattern: /(sleep|waitfor|delay)[\s]*\(/i, severity: 'critical' as Severity, name: 'Time Delay' },
  { pattern: /benchmark\s*\(/i, severity: 'critical' as Severity, name: 'Benchmark' },
  
  // Function-based - MAIS ESPECÍFICO: precisa ter espaço antes ou estar no início
  { pattern: /(^|\s)(version|database|user|schema)\(/i, severity: 'medium' as Severity, name: 'Information Function' },
  { pattern: /(concat|cast|convert|exec|execute|sp_executesql)\(/i, severity: 'critical' as Severity, name: 'Execution Function' },
  
  // Stacked queries
  { pattern: /;[\s]*(drop|delete|truncate|update|insert|alter|create)[\s]+/i, severity: 'critical' as Severity, name: 'Stacked Query' },
  
  // Error-based
  { pattern: /(extractvalue|updatexml|exp|floor|rand)\(/i, severity: 'high' as Severity, name: 'Error Injection' },
  
  // Hex encoding
  { pattern: /0x[0-9a-f]+/i, severity: 'low' as Severity, name: 'Hex Encoding' },
  
  // Classic patterns
  { pattern: /'[\s]*or[\s]*'1'[\s]*=[\s]*'1/i, severity: 'high' as Severity, name: "Classic OR '1'='1'" },
  { pattern: /'[\s]*or[\s]*1[\s]*=[\s]*1/i, severity: 'high' as Severity, name: "Classic OR 1=1" },
  { pattern: /'[\s]*or[\s]*'x'[\s]*=[\s]*'x/i, severity: 'high' as Severity, name: "Classic OR 'x'='x'" },
]

/**
 * Padrões de Command Injection
 * Baseado em OWASP e padrões comuns de ataques
 */
const COMMAND_INJECTION_PATTERNS = [
  // Command chaining operators - MUITO ESPECÍFICO: precisa ser sequência de operadores perigosos
  // Exemplos: ";;", "&&", "||", ";rm", "|cat", etc.
  { pattern: /[;&|`]{2,}|[;&|`]\s*(rm|cat|ls|del|mv|cp|sh|bash|cmd)/i, severity: 'high' as Severity, name: 'Command Chaining' },
  
  // System commands (Unix/Linux)
  { pattern: /(rm[\s]+-rf|del|mv|cp|cat|ls|dir|ps|kill|chmod|chown|sudo|su|sh|bash|nc|netcat)/i, severity: 'critical' as Severity, name: 'System Command' },
  
  // Path traversal
  { pattern: /\.\.(\/|\\)/, severity: 'high' as Severity, name: 'Path Traversal' },
  
  // Redirection
  // eslint-disable-next-line no-useless-escape
  { pattern: /[<>][\s]*[\w./\\]+/, severity: 'medium' as Severity, name: 'Redirection' },
  
  // Environment variables - MAIS ESPECÍFICO: padrão completo ${VAR} ou $VAR no início de linha
  { pattern: /^\$\{[\w]+\}|\$\{[A-Z_]+[A-Z0-9_]+\}/, severity: 'low' as Severity, name: 'Environment Variable' },
  
  // Windows commands
  { pattern: /(ipconfig|netstat|tasklist|systeminfo|whoami|powershell|cmd\.exe)/i, severity: 'critical' as Severity, name: 'Windows Command' },
  
  // Code execution
  { pattern: /(eval|exec|system|shell_exec|passthru|proc_open|popen)\(/i, severity: 'critical' as Severity, name: 'Code Execution' },
  
  // File operations
  { pattern: /(file_get_contents|file_put_contents|fopen|fwrite|fread)\(/i, severity: 'high' as Severity, name: 'File Operation' },
  
  // Network operations
  { pattern: /(curl|wget|fetch|axios|http\.get|http\.post)/i, severity: 'medium' as Severity, name: 'Network Request' },
]

/**
 * Valores conhecidos como seguros (whitelist)
 * Estes padrões não devem ser detectados como maliciosos
 */
const SAFE_PATTERNS = [
  /^[\w\s\-.@/:]+$/, // Texto normal sem caracteres especiais perigosos
  /^[\d.,]+$/, // Números com decimais
  // eslint-disable-next-line no-useless-escape
  /^[\w\-.]+\@[\w\-.]+\.[\w-]+$/, // Emails (@ escapado)
  /^\+?[\d\s()-]+$/, // Telefones (hífen no final não precisa escape)
  /^https?:\/\/[\w.-]+/, // URLs HTTP(S) (hífen no final não precisa escape)
  /^\d{4}-\d{2}-\d{2}/, // Datas (YYYY-MM-DD)
  /^\d{2}\/\d{2}\/\d{4}/, // Datas (DD/MM/YYYY)
  /^[A-Za-z0-9+/=]+$/, // Base64-like strings
]

/**
 * Campos que são conhecidos como seguros e não devem ser analisados
 */
const SAFE_FIELDS = [
  'email',
  'password',
  'passwordHash',
  'token',
  'id',
  'userId',
  'createdAt',
  'updatedAt',
  'image',
  'avatar',
  'photo',
  'url',
  'link',
  'href',
  // Campos do formulário de usuário
  'fullName',
  'whatsapp',
  'age',
  'gender',
  'profession',
  'description',
  'educationOrSpecialty',
  'appUsage',
  'yearsOfExperience',
  'clientsPerWeek',
  'averageSessionPrice',
]

/**
 * Verifica se um campo deve ser ignorado na análise
 */
function isSafeField(fieldName?: string): boolean {
  if (!fieldName) return false
  const lowerField = fieldName.toLowerCase()
  return SAFE_FIELDS.some(safe => lowerField.includes(safe))
}

/**
 * Verifica se um valor está na whitelist de padrões seguros
 */
function isSafeValue(value: string): boolean {
  if (!value || typeof value !== 'string') return true
  
  // Normalizar espaços
  const normalized = value.trim()
  
  // Verificar padrões seguros
  return SAFE_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * Detecta SQL Injection em um valor
 */
function detectSQLInjection(value: string): InjectionDetectionResult | null {
  if (!value || typeof value !== 'string') return null
  
  // Ignorar valores seguros
  if (isSafeValue(value)) return null
  
  // Ignorar valores muito curtos (menos de 4 caracteres)
  const trimmed = value.trim()
  if (trimmed.length < 4) return null

  // Verificar se contém apenas caracteres alfanuméricos e espaços comuns
  // Isso evita falsos positivos em textos normais
  // eslint-disable-next-line no-useless-escape
  if (/^[\w\s\-.,:;?!()"'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]+$/i.test(trimmed)) {
    // Se for texto que parece normal, verificar apenas padrões mais específicos
    // Ignorar padrões que podem aparecer em texto legítimo
    const suspiciousPatterns = SQL_INJECTION_PATTERNS.filter(p => 
      p.severity === 'critical' || 
      p.name.includes('Union') ||
      p.name.includes('Stacked') ||
      p.name.includes('Execution')
    )
    
    for (const { pattern, severity, name } of suspiciousPatterns) {
      if (pattern.test(value)) {
        return {
          detected: true,
          type: 'SQL_INJECTION',
          pattern: name,
          severity,
          details: {
            value: value.substring(0, 100),
            matchedPattern: name
          }
        }
      }
    }
    return null
  }
  
  // Para valores que contêm caracteres especiais, aplicar todos os padrões
  for (const { pattern, severity, name } of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return {
        detected: true,
        type: 'SQL_INJECTION',
        pattern: name,
        severity,
        details: {
          value: value.substring(0, 100),
          matchedPattern: name
        }
      }
    }
  }
  
  return null
}

/**
 * Detecta Command Injection em um valor
 */
function detectCommandInjection(value: string): InjectionDetectionResult | null {
  if (!value || typeof value !== 'string') return null
  
  // Ignorar valores seguros
  if (isSafeValue(value)) return null
  
  // Ignorar valores muito curtos
  const trimmed = value.trim()
  if (trimmed.length < 4) return null
  
  // Verificar se contém apenas caracteres alfanuméricos e espaços comuns
  // eslint-disable-next-line no-useless-escape
  if (/^[\w\s\-.,:;?!()"'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]+$/i.test(trimmed)) {
    // Para texto que parece normal, apenas verificar padrões críticos
    const criticalPatterns = COMMAND_INJECTION_PATTERNS.filter(p => 
      p.severity === 'critical'
    )
    
    for (const { pattern, severity, name } of criticalPatterns) {
      if (pattern.test(value)) {
        return {
          detected: true,
          type: 'COMMAND_INJECTION',
          pattern: name,
          severity,
          details: {
            value: value.substring(0, 100),
            matchedPattern: name
          }
        }
      }
    }
    return null
  }
  
  // Para valores com caracteres especiais, aplicar todos os padrões
  for (const { pattern, severity, name } of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return {
        detected: true,
        type: 'COMMAND_INJECTION',
        pattern: name,
        severity,
        details: {
          value: value.substring(0, 100),
          matchedPattern: name
        }
      }
    }
  }
  
  return null
}

/**
 * Analisa um objeto recursivamente procurando por injeções
 */
function analyzeObject(
  obj: unknown,
  location: Location,
  field?: string
): InjectionDetectionResult[] {
  const results: InjectionDetectionResult[] = []
  
  // Ignorar campos conhecidos como seguros
  if (isSafeField(field)) {
    return results
  }
  
  if (typeof obj === 'string') {
    // Ignorar strings muito curtas (menos de 3 caracteres são geralmente seguras)
    if (obj.trim().length < 3) {
      return results
    }
    
    // Analisar string diretamente
    const sqlResult = detectSQLInjection(obj)
    if (sqlResult) {
      results.push({
        ...sqlResult,
        location,
        details: { ...sqlResult.details, field }
      })
    }
    
    const cmdResult = detectCommandInjection(obj)
    if (cmdResult) {
      results.push({
        ...cmdResult,
        location,
        details: { ...cmdResult.details, field }
      })
    }
  } else if (Array.isArray(obj)) {
    // Analisar cada item do array
    obj.forEach((item, index) => {
      const itemResults = analyzeObject(item, location, field ? `${field}[${index}]` : `[${index}]`)
      results.push(...itemResults)
    })
  } else if (obj && typeof obj === 'object') {
    // Analisar cada propriedade do objeto
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      const itemResults = analyzeObject(value, location, field ? `${field}.${key}` : key)
      results.push(...itemResults)
    })
  }
  
  return results
}

/**
 * Detecta injeções em dados de uma requisição HTTP
 */
export function detectInjection(data: {
  query?: Record<string, unknown>
  body?: unknown
  headers?: Record<string, string>
  path?: string
}): InjectionDetectionResult[] {
  const results: InjectionDetectionResult[] = []
  
  // Analisar query parameters
  if (data.query && typeof data.query === 'object') {
    const queryResults = analyzeObject(data.query, 'query')
    results.push(...queryResults)
  }
  
  // Analisar body
  if (data.body) {
    const bodyResults = analyzeObject(data.body, 'body')
    results.push(...bodyResults)
  }
  
  // Analisar headers (apenas valores específicos, não todos)
  // Headers geralmente contêm valores que podem ter caracteres especiais legítimos
  if (data.headers && typeof data.headers === 'object') {
    // Ignorar headers padrão que podem ter caracteres especiais legítimos
    const ignoredHeaders = ['user-agent', 'referer', 'origin', 'content-type', 'accept', 'authorization']
    
    Object.entries(data.headers).forEach(([key, value]) => {
      // Ignorar headers conhecidos como seguros
      if (ignoredHeaders.includes(key.toLowerCase())) {
        return
      }
      
      if (typeof value === 'string' && value.length > 10) { // Só analisar valores maiores
        const headerResults = analyzeObject(value, 'headers', key)
        results.push(...headerResults)
      }
    })
  }
  
  // Analisar path
  if (data.path && typeof data.path === 'string') {
    const pathResults = analyzeObject(data.path, 'path')
    results.push(...pathResults)
  }
  
  return results
}

/**
 * Retorna a severidade mais alta de uma lista de detecções
 */
export function getHighestSeverity(results: InjectionDetectionResult[]): Severity {
  if (results.length === 0) return 'low'
  
  const severityOrder: Severity[] = ['low', 'medium', 'high', 'critical']
  
  let maxSeverity: Severity = 'low'
  
  results.forEach(result => {
    const currentIndex = severityOrder.indexOf(result.severity)
    const maxIndex = severityOrder.indexOf(maxSeverity)
    
    if (currentIndex > maxIndex) {
      maxSeverity = result.severity
    }
  })
  
  return maxSeverity
}

/**
 * Verifica se qualquer detecção é crítica
 */
export function hasCriticalDetection(results: InjectionDetectionResult[]): boolean {
  return results.some(result => result.severity === 'critical')
}


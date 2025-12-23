/**
 * Processa conteúdo markdown convertendo emojis separadores em quebras de parágrafo
 * e convertendo markdown básico para HTML formatado
 */

/**
 * Lista de emojis que devem funcionar como separadores de parágrafo
 */
const PARAGRAPH_SEPARATORS = ['🌀', '📍', '💡', '🔍', '📌', '✨', '🔑', '⚡', '🌟', '🎯', '📊', '💭', '🧠', '🛡️', '⏳']

/**
 * Limpa HTML literal problemático do conteúdo antes de processar markdown
 * Remove atributos HTML e tags que não devem aparecer como texto
 */
function cleanHtmlLiterals(text: string): string {
  // Lista de padrões HTML problemáticos que devem ser removidos
  // Estes padrões aparecem como texto literal na página e devem ser removidos
  const problematicPatterns = [
    /sandbox="[^"]*"/gi,           // sandbox="allow-scripts..."
    /sandbox='[^']*'/gi,            // sandbox='allow-scripts...'
    /<iframe[^>]*>/gi,               // <iframe ...>
    /<\/iframe>/gi,                  // </iframe>
    /<script[^>]*>[\s\S]*?<\/script>/gi, // <script>...</script>
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers como onclick="..."
  ]
  
  let cleaned = text
  
  // Remove padrões problemáticos
  problematicPatterns.forEach(pattern => {
    const beforeLength = cleaned.length
    cleaned = cleaned.replace(pattern, '')
    
    // Log apenas em desenvolvimento se algo foi removido
    if (process.env.NODE_ENV === 'development' && cleaned.length < beforeLength) {
      console.warn('[markdownProcessor] Removido padrão HTML problemático:', pattern.toString())
    }
  })
  
  return cleaned
}

/**
 * Processa conteúdo markdown/texto e retorna HTML formatado com parágrafos adequados
 */
export function processMarkdownContent(content: string): string {
  if (!content || content.trim().length === 0) {
    return ''
  }

  // DEBUG: Log em desenvolvimento para rastrear conteúdo problemático
  if (process.env.NODE_ENV === 'development' && (content.includes('sandbox') || content.includes('<iframe'))) {
    console.warn('[markdownProcessor] Conteúdo contém HTML literal:', content.substring(0, 200))
  }

  // 0. PRIMEIRO: Limpa HTML literal problemático que pode estar no conteúdo
  // Isso evita que HTML literal apareça como texto na página
  const contentToProcess = cleanHtmlLiterals(content)

  // 1. Primeiro converte markdown básico para HTML
  // IMPORTANTE: Processar negrito ANTES de itálico para evitar conflitos
  let processed = contentToProcess
    // Negrito (dois asteriscos) - substituir por placeholder temporário
    .replace(/\*\*(.+?)\*\*/g, '___STRONG_START___$1___STRONG_END___')
    // Itálico (um asterisco)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Restaurar negrito
    .replace(/___STRONG_START___/g, '<strong>')
    .replace(/___STRONG_END___/g, '</strong>')
  
  // 2. Processa emojis separadores - detecta quando um emoji aparece e adiciona quebra antes
  // Estratégia: Split por emojis separadores e depois reconstrói com parágrafos
  PARAGRAPH_SEPARATORS.forEach(emoji => {
    // Adiciona quebra de linha dupla ANTES do emoji (se não estiver no início já)
    // Procura: qualquer coisa que não seja quebra de linha + emoji + espaço + texto
    processed = processed.replace(
      new RegExp(`([^\\n])(\\s*)(${escapeRegex(emoji)}\\s)`, 'g'),
      `$1\n\n$3`
    )
    
    // Se emoji está no início da linha mas logo após texto na mesma linha, adiciona quebra
    processed = processed.replace(
      new RegExp(`([^\\n\\r])(\\s*)(${escapeRegex(emoji)})`, 'g'),
      `$1\n\n$3`
    )
  })

  // 3. Normaliza quebras de linha múltiplas
  processed = processed.replace(/\n{3,}/g, '\n\n')

  // 4. Divide em parágrafos baseado em quebras de linha duplas
  const paragraphs = processed
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // 5. Processa cada parágrafo e cria HTML
  const paragraphHTML = paragraphs
    .map(paragraph => {
      const trimmed = paragraph.trim()
      
      if (trimmed.length > 0) {
        // Preserva quebras de linha simples dentro do parágrafo
        const withBreaks = trimmed.replace(/\n/g, '<br />')
        return `<p class="markdown-paragraph" style="margin-bottom: 1rem; line-height: 1.6; text-align: justify;">${withBreaks}</p>`
      }
      return ''
    })
    .filter(p => p.length > 0)
    .join('\n')

  return paragraphHTML
}

/**
 * Escapa caracteres especiais para uso em RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}


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
  const startTime = Date.now()
  console.log('🔍 [MARKDOWN PROCESSOR] ========== INÍCIO CLEAN HTML ==========')
  console.log('🔍 [MARKDOWN PROCESSOR] Tamanho do conteúdo original:', text.length)
  
  // Verificar se há iframes ANTES da limpeza
  const hasIframeBefore = /<iframe/i.test(text) || /iframe/i.test(text)
  const hasIframeTag = /<iframe[^>]*>/i.test(text)
  const hasIframeClose = /<\/iframe>/i.test(text)
  const hasIframeAttributes = /(src|style|allowtransparency|sandbox|allow)\s*=/i.test(text)
  
  if (hasIframeBefore || hasIframeTag || hasIframeClose || hasIframeAttributes) {
    console.warn('⚠️ [MARKDOWN PROCESSOR] IFRAME DETECTADO NO CONTEÚDO ORIGINAL!')
    console.warn('⚠️ [MARKDOWN PROCESSOR] Detalhes:', {
      hasIframeBefore,
      hasIframeTag,
      hasIframeClose,
      hasIframeAttributes,
      preview: text.substring(0, 500)
    })
    
    // Extrair trecho completo do iframe para debug
    const iframeMatch = text.match(/<iframe[\s\S]*?<\/iframe>/i) || text.match(/<iframe[^>]*>/i)
    if (iframeMatch) {
      console.warn('⚠️ [MARKDOWN PROCESSOR] Trecho do iframe encontrado:', iframeMatch[0])
    }
  }
  
  // Lista de padrões HTML problemáticos que devem ser removidos
  // Estes padrões aparecem como texto literal na página e devem ser removidos
  const problematicPatterns = [
    // Remove iframes completos (com fechamento)
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    // Remove iframes auto-fechados ou sem fechamento
    /<iframe\b[^>]*\/?>/gi,
    // Remove tags de fechamento de iframe
    /<\/iframe\s*>/gi,
    // Remove atributos de iframe que podem aparecer sozinhos
    /sandbox\s*=\s*["'][^"']*["']/gi,
    /sandbox\s*=\s*[^\s>]*/gi,
    /allowtransparency\s*=\s*["'][^"']*["']/gi,
    /allowtransparency\s*=\s*[^\s>]*/gi,
    /allow\s*=\s*["'][^"']*["']/gi,
    /allow\s*=\s*[^\s>]*/gi,
    // Remove atributos style que podem conter iframe
    /style\s*=\s*["'][^"']*position[^"']*fixed[^"']*["']/gi,
    /style\s*=\s*["'][^"']*width[^"']*100vw[^"']*["']/gi,
    /style\s*=\s*["'][^"']*height[^"']*100vh[^"']*["']/gi,
    // Remove scripts
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<\/script\s*>/gi,
    // Remove event handlers
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^\s>]*/gi,
  ]
  
  let cleaned = text
  let totalRemoved = 0
  
  // Remove padrões problemáticos
  problematicPatterns.forEach((pattern, index) => {
    const beforeLength = cleaned.length
    cleaned = cleaned.replace(pattern, '')
    const removed = beforeLength - cleaned.length
    
    if (removed > 0) {
      totalRemoved += removed
      console.log(`🔍 [MARKDOWN PROCESSOR] Padrão ${index + 1} removido:`, {
        pattern: pattern.toString().substring(0, 50),
        removed: removed,
        chars: 'caracteres'
      })
    }
  })
  
  // Verificação final: ainda há iframe?
  const hasIframeAfter = /<iframe/i.test(cleaned) || /iframe/i.test(cleaned)
  if (hasIframeAfter) {
    console.error('❌ [MARKDOWN PROCESSOR] AINDA HÁ IFRAME APÓS LIMPEZA!')
    console.error('❌ [MARKDOWN PROCESSOR] Conteúdo restante (primeiros 500 chars):', cleaned.substring(0, 500))
    
    // Tentativa adicional de remoção mais agressiva
    cleaned = cleaned
      .replace(/iframe/gi, '')
      .replace(/src\s*=\s*["'][^"']*["']/gi, '')
      .replace(/style\s*=\s*["'][^"']*["']/gi, '')
      .replace(/allowtransparency/gi, '')
      .replace(/sandbox/gi, '')
      .replace(/allow/gi, '')
    
    console.log('🔍 [MARKDOWN PROCESSOR] Limpeza agressiva aplicada')
  } else if (totalRemoved > 0) {
    console.log('✅ [MARKDOWN PROCESSOR] IFRAME removido com sucesso')
  }
  
  const duration = Date.now() - startTime
  console.log('🔍 [MARKDOWN PROCESSOR] Tamanho após limpeza:', cleaned.length)
  console.log('🔍 [MARKDOWN PROCESSOR] Total removido:', totalRemoved, 'caracteres')
  console.log('⏱️ [MARKDOWN PROCESSOR] Tempo de processamento:', duration, 'ms')
  console.log('🔍 [MARKDOWN PROCESSOR] ========== FIM CLEAN HTML ==========')
  
  return cleaned
}

/**
 * Processa conteúdo markdown/texto e retorna HTML formatado com parágrafos adequados
 */
export function processMarkdownContent(content: string): string {
  const processStartTime = Date.now()
  console.log('📝 [MARKDOWN PROCESSOR] ========== INÍCIO PROCESSAMENTO ==========')
  console.log('📝 [MARKDOWN PROCESSOR] Tamanho do conteúdo:', content?.length || 0)
  
  if (!content || content.trim().length === 0) {
    console.log('📝 [MARKDOWN PROCESSOR] Conteúdo vazio, retornando string vazia')
    return ''
  }

  // DEBUG: Verificação inicial de conteúdo problemático
  const hasIframe = /<iframe/i.test(content) || /iframe/i.test(content)
  const hasSandbox = /sandbox/i.test(content)
  const hasStyleFixed = /style\s*=\s*["'][^"']*position[^"']*fixed/i.test(content)
  
  if (hasIframe || hasSandbox || hasStyleFixed) {
    console.warn('⚠️ [MARKDOWN PROCESSOR] Conteúdo contém elementos suspeitos ANTES do processamento:', {
      hasIframe,
      hasSandbox,
      hasStyleFixed,
      preview: content.substring(0, 300)
    })
  }

  // 0. PRIMEIRO: Limpa HTML literal problemático que pode estar no conteúdo
  // Isso evita que HTML literal apareça como texto na página
  const contentToProcess = cleanHtmlLiterals(content)
  
  // Verificação após limpeza
  const stillHasIframe = /<iframe/i.test(contentToProcess) || /iframe/i.test(contentToProcess)
  if (stillHasIframe) {
    console.error('❌ [MARKDOWN PROCESSOR] IFRAME AINDA PRESENTE APÓS LIMPEZA!')
    console.error('❌ [MARKDOWN PROCESSOR] Conteúdo processado (primeiros 500 chars):', contentToProcess.substring(0, 500))
  }

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
  let paragraphHTML = paragraphs
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

  // Verificação final antes de retornar
  const finalHasIframe = /<iframe/i.test(paragraphHTML) || /iframe/i.test(paragraphHTML)
  if (finalHasIframe) {
    console.error('❌ [MARKDOWN PROCESSOR] IFRAME NO HTML FINAL!')
    console.error('❌ [MARKDOWN PROCESSOR] HTML final (primeiros 500 chars):', paragraphHTML.substring(0, 500))
    
    // Remoção de emergência
    paragraphHTML = paragraphHTML
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<iframe\b[^>]*\/?>/gi, '')
      .replace(/<\/iframe\s*>/gi, '')
      .replace(/iframe/gi, '')
    
    console.log('🔍 [MARKDOWN PROCESSOR] Remoção de emergência aplicada')
  }
  
  const processDuration = Date.now() - processStartTime
  console.log('📝 [MARKDOWN PROCESSOR] Tamanho do HTML final:', paragraphHTML.length)
  console.log('⏱️ [MARKDOWN PROCESSOR] Tempo total de processamento:', processDuration, 'ms')
  console.log('📝 [MARKDOWN PROCESSOR] ========== FIM PROCESSAMENTO ==========')
  
  return paragraphHTML
}

/**
 * Escapa caracteres especiais para uso em RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}


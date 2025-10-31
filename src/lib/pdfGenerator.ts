import html2pdf from 'html2pdf.js'
import { logger } from '@/lib/logger'

interface PDFData {
  question: string
  answer: string
  timestamp: Date
  sessionId?: string
  patientName?: string
  therapistName?: string
}

/**
 * Gera PDF com o conteúdo da consulta do chat
 * Preserva formatação HTML e inclui metadados organizados
 */
export async function generateChatPDF(data: PDFData): Promise<void> {
  try {
    logger.debug('🔍 Debug PDF - Dados recebidos:', {
      question: data.question,
      answerLength: data.answer?.length || 0,
      hasAnswer: !!data.answer,
      timestamp: data.timestamp
    })
    
    // Debug específico para IMPACTO BIOLÓGICO
    logger.debug('🔍 Debug PDF - Answer content preview:', data.answer?.substring(0, 200))
    logger.debug('🔍 Debug PDF - Answer contains IMPACTO BIOLÓGICO:', data.answer?.includes('IMPACTO BIOLÓGICO'))
    logger.debug('🔍 Debug PDF - Answer contains **IMPACTO BIOLÓGICO**:', data.answer?.includes('**IMPACTO BIOLÓGICO**'))

    // Cria o HTML que será convertido para PDF
    const htmlContent = createPDFHTML(data)
    
    logger.debug('🔍 Debug PDF - HTML gerado:', {
      htmlLength: htmlContent?.length || 0,
      hasContent: htmlContent?.includes('answer-content') || false
    })
    
    // Configurações do PDF otimizadas
    const options = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      filename: `relatorio-de-origem-emocional-${formatDateForFilename(data.timestamp)}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait' as const,
        compress: true
      }
    }

    logger.debug('🔍 Debug PDF - Iniciando geração...')
    
    // Gera e baixa o PDF
    await html2pdf().set(options).from(htmlContent).save()
    
    logger.debug('✅ Debug PDF - PDF gerado com sucesso!')
  } catch (error) {
    logger.error('❌ Erro ao gerar PDF:', error)
    throw new Error('Falha na geração do PDF')
  }
}

/**
 * Processa e organiza o conteúdo HTML da resposta para melhor formatação no PDF
 * Versão simplificada e robusta para evitar seções vazias
 */
function processAnswerContent(htmlContent: string): string {
  console.log('🔍 Debug processAnswerContent - Input:', {
    contentLength: htmlContent?.length || 0,
    hasContent: !!htmlContent,
    firstChars: htmlContent?.substring(0, 100) || 'VAZIO'
  })

  // Se o conteúdo estiver vazio, retorna uma mensagem padrão
  if (!htmlContent || htmlContent.trim().length === 0) {
    console.log('⚠️ Debug processAnswerContent - Conteúdo vazio, retornando mensagem padrão')
    return '<p style="margin-bottom: 10px; text-align: justify; line-height: 1.5;">Conteúdo não disponível.</p>'
  }

  // Versão simplificada: divide por quebras de linha e processa cada parte
  const lines = htmlContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  console.log('🔍 Debug processAnswerContent - Linhas encontradas:', lines.length)
  
  let result = ''
  let currentSection = ''
  let currentSectionTitle = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Debug específico para IMPACTO BIOLÓGICO
    if (line.toUpperCase().includes('IMPACTO BIOLÓGICO')) {
      console.log(`🔍 Encontrou IMPACTO BIOLÓGICO na linha ${i}: "${line}"`)
      console.log(`🔍 isSectionTitle retornou: ${isSectionTitle(line)}`)
    }
    
    // Verifica se é um título de seção
    if (isSectionTitle(line)) {
      // Verificação especial para "LATERALIDADE DEPENDE..." - deve ser tratado como conteúdo
      const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').trim().toUpperCase()
      if (cleanLine.includes('LATERALIDADE') && cleanLine.includes('DEPENDE')) {
        console.log(`🔄 Linha especial "${line}" - tratando como conteúdo da seção atual`)
        if (currentSection) {
          currentSection += '\n' + line
        } else {
          currentSection = line
        }
        continue
      }
      
      console.log(`✅ Título detectado: "${line}"`)
      
      // Salva seção anterior se tiver conteúdo
      if (currentSectionTitle && currentSection.trim()) {
        result += createSectionHTML(currentSectionTitle, currentSection.trim())
        console.log(`✅ Seção criada: ${currentSectionTitle}`)
      }
      
      // Inicia nova seção
      currentSectionTitle = line
      currentSection = ''
      
      // Pula apenas barras horizontais que aparecem logo após o título
      if (i + 1 < lines.length && /^[-=_]{2,}$/.test(lines[i + 1].trim())) {
        i++ // Pula a barra horizontal
      }
    } else {
      // Adiciona conteúdo à seção atual
      if (currentSection) {
        currentSection += '\n' + line
      } else {
        currentSection = line
      }
    }
  }
  
  // Adiciona a última seção
  if (currentSectionTitle && currentSection.trim()) {
    result += createSectionHTML(currentSectionTitle, currentSection.trim())
    console.log(`✅ Última seção criada: ${currentSectionTitle}`)
  } else if (currentSection.trim()) {
    // Se não tem título mas tem conteúdo, cria seção geral
    result += createSectionHTML('RESPOSTA', currentSection.trim())
    console.log('✅ Seção geral criada: RESPOSTA')
  }

  // Se não gerou nada, pelo menos mostra o conteúdo original
  if (result.trim().length === 0) {
    console.log('⚠️ Debug processAnswerContent - Nenhum resultado gerado, usando conteúdo original')
    result = createSectionHTML('RESPOSTA', htmlContent.trim())
  }

  console.log('🔍 Debug processAnswerContent - Resultado final:', {
    resultLength: result.length,
    hasContent: result.includes('<div') || result.includes('<p')
  })

  return result
}

/**
 * Verifica se uma linha é um título de seção
 */
function isSectionTitle(line: string): boolean {
  const sectionKeywords = [
    'CONTEXTO GERAL', 
    'IMPACTO BIOLÓGICO', 
    'SÍMBOLOS BIOLÓGICOS', 
    'CONFLITO EMOCIONAL SUBAJACENTE',
    'CONFLITO EMOCIONAL',
    'EXPERIÊNCIAS COMUNS', 
    'PADRÕES DE COMPORTAMENTO', 
    'IMPACTO TRANSGERACIONAL',
    'LATERALIDADE', 
    'FASES DA DOENÇA', 
    'POSSÍVEIS DOENÇAS CORRELACIONADAS', 
    'PERGUNTAS REFLEXIVAS', 
    'CHAVE TERAPÊUTICA',
    'CHAVE RESSENTIR',
    'CHAVE [RE]SENTIR'
  ]
  
  // Remove formatação markdown (**texto**, *texto*, etc.) e normaliza espaços
  const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
  const upperLine = cleanLine.toUpperCase()
  
  // Debug específico para seções conhecidas e a DICA
  if (upperLine.includes('IMPACTO') || upperLine.includes('CONTEXTO') || upperLine.includes('SÍMBOLOS') || upperLine.includes('CHAVE') || upperLine.includes('LATERALIDADE') || upperLine.includes('EXPERIÊNCIAS COMUNS') || upperLine.includes('CONFLITO EMOCIONAL') || upperLine.startsWith('DICA:')) {
    console.log(`🔍 Debug isSectionTitle - Linha original: "${line}"`)
    console.log(`🔍 Debug isSectionTitle - Linha limpa: "${cleanLine}"`)
    console.log(`🔍 Debug isSectionTitle - Upper (normalized): "${upperLine}"`)
    console.log(`🔍 Debug isSectionTitle - Length: ${upperLine.length}`)
    console.log(`🔍 Debug isSectionTitle - Char codes:`, Array.from(upperLine).map(c => c.charCodeAt(0)))
    const isSection = sectionKeywords.some(keyword => upperLine.startsWith(keyword.toUpperCase()) && upperLine.length >= keyword.toUpperCase().length);
    console.log(`🔍 Debug isSectionTitle - Is a section title? ${isSection}`);
    if (upperLine.includes('EXPERIÊNCIAS COMUNS')) {
      console.log(`🔍 Debug EXPERIÊNCIAS COMUNS - Detecção: ${isSection}`);
    }
    if (upperLine.includes('CONFLITO EMOCIONAL')) {
      console.log(`🔍 Debug CONFLITO EMOCIONAL - Detecção: ${isSection}`);
    }
    if (upperLine.startsWith('DICA:')) {
      console.log(`🔍 Debug DICA - Detecção: ${isSection}`);
    }
  }
  
  // Ordena as palavras-chave por comprimento (mais longas primeiro) para evitar detecção incorreta
  const sortedKeywords = sectionKeywords.sort((a, b) => b.length - a.length)
  
  for (const keyword of sortedKeywords) {
    const upperKeyword = keyword.toUpperCase()
    
    // Verifica se a linha começa exatamente com a palavra-chave (mais preciso)
    const exactMatch = upperLine.startsWith(upperKeyword)
    
    // Para evitar falsos positivos, só considera "includes" se a linha for muito próxima do tamanho da palavra-chave
    const includesMatch = upperLine.includes(upperKeyword) && 
                         upperLine.length <= upperKeyword.length + 5 && 
                         !upperLine.includes('DEPENDE') && // Evita "LATERALIDADE DEPENDE..."
                         !upperLine.includes('POIS') // Evita outras variações
    
    // Debug específico para seções importantes
    if (upperKeyword.includes('CHAVE') || upperKeyword.includes('LATERALIDADE') || upperKeyword.includes('EXPERIÊNCIAS COMUNS') || upperKeyword.includes('CONFLITO EMOCIONAL')) {
      console.log(`🔍 Debug ${upperKeyword} - Line: "${upperLine}"`)
      console.log(`🔍 Debug ${upperKeyword} - Exact match: ${exactMatch}`)
      console.log(`🔍 Debug ${upperKeyword} - Includes match: ${includesMatch}`)
      console.log(`🔍 Debug ${upperKeyword} - Length check: ${upperLine.length <= upperKeyword.length + 5}`)
      console.log(`🔍 Debug ${upperKeyword} - Contains DEPENDE: ${upperLine.includes('DEPENDE')}`)
    }
    
    if (exactMatch || includesMatch) {
      return true
    }
  }
  
  return false
}

/**
 * Processa conteúdo markdown para PDF (versão com estilos inline)
 */
function processMarkdownForPDF(content: string): string {
  if (!content || content.trim().length === 0) {
    return ''
  }

  // Lista de emojis separadores
  const PARAGRAPH_SEPARATORS = ['🌀', '📍', '💡', '🔍', '📌', '✨', '🔑', '⚡', '🌟', '🎯', '📊', '💭', '🧠', '🛡️', '⏳']
  
  function escapeRegex(str: string): string {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  }

  // 1. Primeiro converte markdown básico para HTML
  let processed = content
    // Negrito (dois asteriscos) - substituir por placeholder temporário
    .replace(/\*\*(.+?)\*\*/g, '___STRONG_START___$1___STRONG_END___')
    // Itálico (um asterisco)
    .replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: #6b7280;">$1</em>')
    // Restaurar negrito com estilos inline para PDF
    .replace(/___STRONG_START___/g, '<strong style="font-weight: 600; color: #1f2937;">')
    .replace(/___STRONG_END___/g, '</strong>')
    // Ícones de placeholder
    .replace(/\(pink brain icon\)/g, '🧠')
    .replace(/\(blue shield icon\)/g, '🛡️')
    .replace(/\(hourglass icon\)/g, '⏳')
    .replace(/\(lightning bolt icon\)/g, '⚡')
  
  // 2. Processa emojis separadores - adiciona quebra de parágrafo ANTES do emoji
  PARAGRAPH_SEPARATORS.forEach(emoji => {
    // Adiciona quebra de linha dupla ANTES do emoji (se não estiver no início já)
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

  // 5. Processa cada parágrafo e cria HTML com estilos inline para PDF
  const paragraphHTML = paragraphs
    .map(paragraph => {
      const trimmed = paragraph.trim()
      
      if (trimmed.length > 0) {
        // Preserva quebras de linha simples dentro do parágrafo
        const normalizedParagraph = trimmed.replace(/\n{2,}/g, '\n').replace(/\n/g, '<br />')
        // CSS otimizado para evitar quebras no meio de frases - mantém palavras íntegras
        return `<p style="margin-bottom: 12px; text-align: justify; line-height: 1.6; color: #1f2937; font-size: 13px; orphans: 3; widows: 3; page-break-inside: avoid; break-inside: avoid; word-break: keep-all; overflow-wrap: anywhere; hyphens: manual;">${normalizedParagraph}</p>\n`
      }
      return ''
    })
    .filter(p => p.length > 0)
    .join('\n')

  return paragraphHTML
}

/**
 * Cria HTML para uma seção
 */
function createSectionHTML(title: string, content: string): string {
  if (!content || content.trim().length === 0) return ''
  
  // Limpa o título removendo formatação markdown
  const cleanTitle = title.replace(/\*\*/g, '').replace(/\*/g, '').replace(/:/g, '').trim()
  
  // Mantém o conteúdo original sem remover nada - apenas processa formatação
  // O título duplicado será tratado apenas visualmente (não removido do conteúdo)
  const cleanedContent = content.trim()
  
  // Usa a função de processamento que detecta emojis como separadores
  const paragraphHTML = processMarkdownForPDF(cleanedContent)
  
  return `
    <div class="content-section" style="margin-bottom: 25px; page-break-inside: avoid; break-inside: avoid;">
      <div class="section-header" style="display: flex; align-items: center; margin-bottom: 12px; page-break-inside: avoid; page-break-after: avoid; break-inside: avoid; break-after: avoid;">
        <div class="section-bar" style="width: 4px; height: 20px; background: #4f46e5; margin-right: 8px; border-radius: 2px;"></div>
        <h2 class="section-title" style="font-size: 14px; font-weight: 600; color: #4f46e5; margin: 0; text-transform: uppercase; page-break-after: avoid; page-break-inside: avoid; break-after: avoid; break-inside: avoid;">
          ${cleanTitle}
        </h2>
      </div>
      <div class="section-content" style="padding-left: 12px;">
        ${paragraphHTML}
      </div>
    </div>
  `
}

/**
 * Cria o HTML estruturado e bem organizado para o PDF
 */
function createPDFHTML(data: PDFData): string {
  const formattedDate = formatDate(data.timestamp)
  const formattedTime = formatTime(data.timestamp)
  
  // Processa o conteúdo da resposta para melhor organização
  const processedAnswer = processAnswerContent(data.answer)
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consulta Médica</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          font-size: 14px;
        }
        
        .page-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 3px solid #4f46e5;
        }
        
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 8px;
        }
        
        .logo .highlight {
          color: #fbbf24;
        }
        
        .title {
          font-size: 16px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .patient-info {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 5px solid #0ea5e9;
        }
        
        .patient-name {
          font-size: 16px;
          font-weight: bold;
          color: #0c4a6e;
          margin-bottom: 8px;
        }
        
        .metadata {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 4px solid #4f46e5;
        }
        
        .metadata-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        
        .metadata-item {
          font-size: 11px;
        }
        
        .metadata-label {
          font-weight: 600;
          color: #374151;
        }
        
        .metadata-value {
          color: #6b7280;
        }
        
        .question-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #4f46e5;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 4px;
        }
        
        .question-content {
          background: #f0f9ff;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #0ea5e9;
          font-size: 14px;
          font-weight: 500;
          color: #0c4a6e;
        }
        
        .answer-content {
          font-size: 13px;
          line-height: 1.6;
          color: #1f2937;
        }
        
        .answer-content p {
          margin-bottom: 12px;
          text-align: justify;
          line-height: 1.5;
          text-indent: 0;
          word-break: keep-all;
          overflow-wrap: anywhere;
          hyphens: manual;
          page-break-inside: avoid;
          break-inside: avoid;
          white-space: pre-wrap;
        }
        
        .answer-content h1, .answer-content h2, .answer-content h3 {
          color: #1f2937;
          margin: 20px 0 10px 0;
          font-weight: 600;
          page-break-after: avoid;
        }
        
        .answer-content h1 {
          font-size: 16px;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 8px;
          margin-top: 25px;
        }
        
        .answer-content h2 {
          font-size: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
          margin-top: 20px;
        }
        
        .answer-content h3 {
          font-size: 14px;
          border-left: 3px solid #4f46e5;
          padding-left: 10px;
          margin-top: 15px;
        }
        
        .answer-content ul, .answer-content ol {
          margin: 12px 0 12px 20px;
          padding-left: 0;
        }
        
        .answer-content li {
          margin-bottom: 6px;
          line-height: 1.4;
          padding-left: 5px;
        }
        
        .answer-content strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        .answer-content em {
          color: #6b7280;
          font-style: italic;
        }
        
        .answer-content blockquote {
          border-left: 3px solid #4f46e5;
          padding-left: 15px;
          margin: 15px 0;
          background: #f8fafc;
          padding: 10px 15px;
          border-radius: 4px;
          font-style: italic;
        }
        
        .answer-content code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #e11d48;
        }
        
        .answer-content pre {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 10px 0;
          border: 1px solid #e5e7eb;
        }
        
        .answer-content pre code {
          background: none;
          padding: 0;
          color: #1f2937;
        }
        
        /* Melhorias para quebra de página */
        .answer-content h1, .answer-content h2 {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .answer-content p, .answer-content li {
          orphans: 3;
          widows: 3;
          word-wrap: break-word;
          hyphens: auto;
          word-break: break-word;
        }
        
        /* Previne quebra de palavras no meio */
        .answer-content p {
          overflow-wrap: break-word;
          word-spacing: normal;
        }
        
        .answer-content ul, .answer-content ol {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Previne quebra de seções e cabeçalhos */
        .content-section {
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 3;
          widows: 3;
        }
        
        .section-header {
          page-break-inside: avoid;
          page-break-after: avoid;
          break-inside: avoid;
          break-after: avoid;
        }
        
        .section-title {
          page-break-after: avoid;
          page-break-inside: avoid;
          break-after: avoid;
          break-inside: avoid;
        }
        
        .section-content {
          page-break-before: avoid;
          break-before: avoid;
        }
        
        /* Garante que pelo menos 2 linhas fiquem juntas */
        .section-header + .section-content {
          page-break-before: avoid;
          break-before: avoid;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
        
        .disclaimer {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 10px;
          margin-top: 15px;
          font-size: 10px;
          color: #92400e;
        }
        
        .disclaimer strong {
          color: #92400e;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body {
            font-size: 13px;
          }
          
          .page-container {
            padding: 15px;
          }
          
          .header {
            margin-bottom: 20px;
          }
          
          .metadata {
            margin-bottom: 15px;
          }
          
          .question-section {
            margin-bottom: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          <div class="logo">
            me<span class="highlight">DIZ</span>!
          </div>
          <div class="title">Relatório de Origem Emocional</div>
        </div>
        
        <div class="metadata" style="text-align: left; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4f46e5;">
          <div class="metadata-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${data.therapistName ? `
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">👤 Terapeuta:</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${escapeHtml(data.therapistName)}</span>
            </div>
            ` : ''}
            ${data.patientName ? `
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">👤 Paciente:</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${escapeHtml(data.patientName)}</span>
            </div>
            ` : ''}
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">📅 Data:</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${formattedDate}</span>
            </div>
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">🕐 Hora:</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${formattedTime}</span>
            </div>
          </div>
        </div>
        
        <div class="question-section">
          <div class="section-title">Sintoma</div>
          <div class="question-content">
            ${escapeHtml(data.question)}
          </div>
        </div>
        
        <div class="answer-section">
          <div class="section-title">💡 Resposta</div>
          <div class="answer-content">
            ${processedAnswer}
          </div>
        </div>
        
        <div class="footer">
          <div class="disclaimer">
            <strong>⚠️ Importante:</strong> Sempre consulte um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.
          </div>
          <div style="margin-top: 12px;">
            © ${new Date().getFullYear()} Relatório de Origem Emocional
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata hora para exibição
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formata data para nome do arquivo
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Escapa caracteres HTML para segurança
 * Funciona tanto no servidor quanto no cliente
 */
function escapeHtml(text: string): string {
  if (!text) return ''
  // Usa método que funciona em ambos os ambientes
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  // Fallback para servidor (embora generateChatPDF seja executado no cliente)
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

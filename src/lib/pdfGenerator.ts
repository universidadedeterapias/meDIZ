import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { LanguageCode } from '@/i18n/config'

interface PDFData {
  question: string
  answer: string
  timestamp: Date
  sessionId?: string
  patientName?: string
  therapistName?: string
  language?: LanguageCode
}

/**
 * Gera PDF com o conteúdo da consulta do chat
 */
export async function generateChatPDF(data: PDFData): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('generateChatPDF deve ser executado no cliente (browser)')
  }

  if (!data.answer || data.answer.trim().length === 0) {
    throw new Error('Answer está vazio - não é possível gerar PDF sem conteúdo')
  }

  const language = data.language || 'pt-BR'
  const htmlContent = createPDFHTML(data, language)

  // Cria elemento temporário FORA da viewport mas visível para html2canvas
  const tempDiv = document.createElement('div')
  tempDiv.setAttribute('data-pdf-temp', 'true')
  tempDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 210mm;
    min-height: 100vh;
    padding: 20px;
    background-color: #ffffff;
    color: #1f2937;
    opacity: 1;
    visibility: visible;
    display: block;
    z-index: 1;
  `
  tempDiv.innerHTML = htmlContent
  document.body.appendChild(tempDiv)

  // Aguarda renderização completa
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => setTimeout(resolve, 300))

  // Verifica se há conteúdo
  const hasContent = tempDiv.textContent && tempDiv.textContent.trim().length > 0
  if (!hasContent) {
    document.body.removeChild(tempDiv)
    throw new Error('Conteúdo não encontrado no HTML gerado')
  }

  try {
    // Usa html2canvas moderno para capturar o elemento
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: Math.max(3000, tempDiv.scrollHeight + 200),
      scrollX: 0,
      scrollY: 0,
      logging: false
    })

    // Calcula dimensões do PDF (A4 em mm)
    const pdfWidth = 210 // A4 width in mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    // Cria PDF com jsPDF moderno
    const pdf = new jsPDF({
      orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    })

    // Adiciona a imagem do canvas ao PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)

    // Salva o PDF
    const filename = `${getFilenamePrefix(language)}-${formatDateForFilename(data.timestamp)}.pdf`
    pdf.save(filename)
  } finally {
    // Remove elemento temporário
    if (tempDiv.parentNode) {
      document.body.removeChild(tempDiv)
    }
  }
}

/**
 * Processa conteúdo de Lateralidade com subseções especiais
 */
function processLateralidadeContent(html: string): string {
  // Detecta e formata subseções especiais
  // Lado Direito, Lado Esquerdo, ATENÇÃO!, DICA:
  html = html.replace(
    /<p><strong>(Lado Direito|Lado Esquerdo|Right Side|Left Side):?<\/strong><\/p>/gi,
    '<p class="lateralidade-subsection"><strong>$1:</strong></p>'
  )
  
  html = html.replace(
    /<p><strong>(ATENÇÃO!|ATTENTION!|⚠️|⚠)<\/strong><\/p>/gi,
    '<p class="lateralidade-warning"><strong>$1</strong></p>'
  )
  
  html = html.replace(
    /<p><strong>(DICA:|TIP:|💡):?<\/strong><\/p>/gi,
    '<p class="lateralidade-tip"><strong>$1</strong></p>'
  )
  
  return html
}

/**
 * Processa markdown para HTML com seções estruturadas
 */
function processMarkdownToHTML(content: string, _language: LanguageCode = 'pt-BR'): string {
  if (!content || content.trim().length === 0) {
    return '<p>Conteúdo não disponível.</p>'
  }

  // Lista de SEÇÕES PRINCIPAIS conhecidas - apenas essas são tratadas como seções
  // Tudo que está em negrito mas não está nesta lista é tratado como conteúdo normal
  const mainSections = [
    'Contexto Geral',
    'Contexto General',
    'General Context',
    'Impacto Biológico',
    'Biological Impact',
    'Símbolos Biológicos',
    'Biological Symbols',
    'Biological Symbol',
    'Conflito Emocional Subjacente',
    'Conflicto Emocional Subyacente',
    'Underlying Emotional Conflict',
    'Experiências comuns',
    'Experiencias comunes',
    'Common Experiences',
    'Padrões de comportamento',
    'Patrones de comportamiento',
    'Behavior Patterns',
    'Behavioral Patterns',
    'Impacto Transgeracional',
    'Impacto Transgeneracional',
    'Transgenerational Impact',
    'Lateralidade',
    'Lateralidad',
    'Laterality',
    'Fases da doença',
    'Fases de la enfermedad',
    'Disease Phases',
    'Phases of the Condition',
    'Fases da manifestação',
    'Phases of manifestation',
    'Possíveis doenças correlacionadas',
    'Posibles enfermedades correlacionadas',
    'Possible Correlated Diseases',
    'Possible Related Conditions',
    'Possible Correlated Conditions',
    'Perguntas Reflexivas',
    'Preguntas Reflexivas',
    'Reflective Questions',
    'Chave Terapêutica do [RE]Sentir',
    'Clave Terapéutica del [RE]Sentir',
    'Therapeutic Key of [RE]Feeling',
    'Therapeutic Key of [RE]Sentir',
    '[RE]Sentir Therapeutic Key'
  ]

  // Função para verificar se um título é uma seção principal
  function isMainSection(title: string): boolean {
    const titleLower = title.toLowerCase().trim()
    return mainSections.some(section => {
      const sectionLower = section.toLowerCase()
      return titleLower === sectionLower || titleLower.includes(sectionLower) || sectionLower.includes(titleLower)
    })
  }

  // Extrai apenas as seções principais
  const sections: Array<{ title: string; content: string; index: number }> = []
  
  // Procura por textos em negrito no formato **Título** ou **Título:**
  const boldPattern = /\*\*([^*]+?)\*\*:?\s*\n/g
  const matches = Array.from(content.matchAll(boldPattern))
  
  // Filtra apenas as seções principais
  const mainSectionMatches = matches.filter(match => {
    const title = match[1].trim()
    return isMainSection(title)
  })
  
  // Processa cada seção principal
  for (let i = 0; i < mainSectionMatches.length; i++) {
    const match = mainSectionMatches[i]
    const title = match[1].trim()
    const startIndex = match.index! + match[0].length
    
    // Determina onde termina o conteúdo desta seção (até a próxima seção principal ou fim)
    const endIndex = i < mainSectionMatches.length - 1 
      ? mainSectionMatches[i + 1].index! 
      : content.length
    
    // Extrai TODO o conteúdo da seção (incluindo textos em negrito que são parte do conteúdo)
    const sectionContent = content.substring(startIndex, endIndex).trim()
    
    if (sectionContent.length > 0) {
      sections.push({ 
        title, 
        content: sectionContent,
        index: match.index!
      })
    }
  }

  // Ordena seções pela posição no documento
  sections.sort((a, b) => a.index - b.index)

  let html = ''
  
  // Processa cada seção
  for (const section of sections) {
    const titleLower = section.title.toLowerCase()
    
    // Contexto Geral e Impacto Biológico sempre sem listas (apenas parágrafos)
    const isParagraphOnly = titleLower.includes('contexto geral') ||
                            titleLower.includes('general context') ||
                            titleLower.includes('contexto general') ||
                            titleLower.includes('impacto biológico') ||
                            titleLower.includes('biological impact')
    
    // Lateralidade precisa de tratamento especial para subseções
    const isLateralidade = titleLower.includes('lateralidade') ||
                           titleLower.includes('laterality')
    
    // Todas as outras seções podem ter listas (incluindo Chave Terapêutica, Símbolos Biológicos, Fases, etc.)
    const allowLists = !isParagraphOnly
    
    // Processa conteúdo com tratamento especial para Lateralidade
    let processedContent = processContentToHTML(section.content, allowLists)
    
    // Tratamento especial para Lateralidade: formata subseções
    if (isLateralidade) {
      processedContent = processLateralidadeContent(processedContent)
    }
    
    html += `<div class="content-section">
      <div class="content-section-title">${section.title.toUpperCase()}</div>
      <div class="content-section-body">${processedContent}</div>
    </div>`
  }
  
  // Se não encontrou seções, processa o conteúdo completo
  if (!html) {
    html = `<div class="content-section-body">${processContentToHTML(content, false)}</div>`
  }
  
  return html
}

/**
 * Processa conteúdo markdown para HTML
 * @param text - Texto markdown a processar
 * @param allowLists - Se true, processa listas com ícones. Se false, converte tudo em parágrafos
 */
function processContentToHTML(text: string, allowLists: boolean = true): string {
  if (!text) return ''
  
  // Primeiro processa negrito e itálico
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  
  // Se não permite listas, converte tudo em parágrafos preservando quebras de linha
  if (!allowLists) {
    // Remove marcadores de lista
    html = html.replace(/^[-•]\s+/gm, '')
    
    // Normaliza quebras de linha múltiplas (3+ viram 2)
    html = html.replace(/\n{3,}/g, '\n\n')
    
    // Divide por parágrafos duplos (quebras de linha duplas)
    const paragraphs = html.split(/\n\n+/)
    
    return paragraphs
      .map(p => {
        const trimmed = p.trim()
        if (!trimmed) return ''
        
        // Preserva quebras de linha simples dentro do parágrafo
        // Converte quebras de linha simples em <br /> para manter a formatação original
        const withBreaks = trimmed
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('<br />')
        
        return `<p>${withBreaks}</p>`
      })
      .filter(p => p.length > 0)
      .join('')
  }
  
  // Se permite listas, processa normalmente preservando quebras de linha
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  let currentList: string[] = []
  let inNumberedList = false
  let currentNumberedList: string[] = []
  let currentParagraphLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()
    
    // Detecta perguntas numeradas (#1, #2, etc.)
    const numberedMatch = trimmedLine.match(/^#(\d+)/)
    if (numberedMatch) {
      // Fecha parágrafo acumulado se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }
      
      if (!inNumberedList) {
        inNumberedList = true
        currentNumberedList = []
        // Fecha lista normal se estiver aberta
        if (inList) {
          processedLines.push(`<ul>${currentList.join('')}</ul>`)
          currentList = []
          inList = false
        }
      }
      // Extrai o número e o texto da pergunta
      const questionNumber = numberedMatch[1]
      let questionText = trimmedLine.replace(/^#\d+\s*/, '').trim()
      // Preserva quebras de linha dentro da pergunta convertendo em <br />
      questionText = questionText.replace(/\n/g, '<br />')
      currentNumberedList.push(`<li class="numbered-question" data-number="#${questionNumber}">${questionText}</li>`)
      continue
    }
    
    // Verifica se é uma linha de lista (começa com - ou •)
    if (/^[-•]\s+/.test(trimmedLine)) {
      // Fecha parágrafo acumulado se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }
      
      // Fecha lista numerada se estiver aberta
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }
      
      if (!inList) {
        inList = true
        currentList = []
      }
      // Remove o marcador e adiciona à lista
      // Preserva quebras de linha dentro do item da lista
      let listItem = trimmedLine.replace(/^[-•]\s+/, '')
      // Converte quebras de linha em <br /> para preservar formatação
      listItem = listItem.replace(/\n/g, '<br />')
      currentList.push(`<li>${listItem}</li>`)
    } else if (trimmedLine.length === 0) {
      // Linha vazia - fecha parágrafo atual se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }
      
      // Fecha listas se estiverem abertas
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }
      if (inList) {
        processedLines.push(`<ul>${currentList.join('')}</ul>`)
        currentList = []
        inList = false
      }
    } else {
      // Fecha listas se estiverem abertas
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }
      if (inList) {
        processedLines.push(`<ul>${currentList.join('')}</ul>`)
        currentList = []
        inList = false
      }
      
      // Adiciona linha ao parágrafo atual (preserva quebras de linha)
      currentParagraphLines.push(trimmedLine)
    }
  }
  
  // Fecha listas se ainda estiverem abertas
  if (inNumberedList && currentNumberedList.length > 0) {
    processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
  }
  if (inList && currentList.length > 0) {
    processedLines.push(`<ul>${currentList.join('')}</ul>`)
  }
  
  // Fecha último parágrafo se houver
  if (currentParagraphLines.length > 0) {
    processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
  }
  
  // Junta tudo
  html = processedLines.join('')
  
  return html
}

/**
 * Cria o HTML completo do PDF
 */
function createPDFHTML(data: PDFData, language: LanguageCode): string {
  const formattedDate = formatDate(data.timestamp)
  const formattedTime = formatTime(data.timestamp)
  const processedAnswer = processMarkdownToHTML(data.answer, language)

  const translations = getTranslations(language)

  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${translations.reportTitle}</title>
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
        
        .therapist-name {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-top: 12px;
          margin-bottom: 8px;
        }
        
        .title {
          font-size: 16px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .metadata {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          border-left: 5px solid #0ea5e9;
          width: fit-content;
        }
        
        .metadata-item {
          font-size: 13px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
        }
        
        .metadata-item:last-child {
          margin-bottom: 0;
        }
        
        .metadata-label {
          font-weight: 600;
          color: #0c4a6e;
          margin-right: 8px;
        }
        
        .metadata-value {
          color: #0c4a6e;
        }
        
        .question-section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .question-content {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          padding: 12px;
          border-radius: 8px;
          border-left: 5px solid #0ea5e9;
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
          margin-bottom: 14px;
          text-align: justify;
          line-height: 1.7;
        }
        
        .answer-content p:last-child {
          margin-bottom: 0;
        }
        
        .answer-content strong {
          font-weight: 600;
          color: #1f2937;
        }
        
        .answer-content em {
          font-style: italic;
          color: #6b7280;
        }
        
        .content-section {
          margin-bottom: 30px;
        }
        
        .content-section-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-left: 12px;
          border-left: 4px solid #4f46e5;
        }
        
        .content-section-body {
          padding-left: 16px;
          margin-top: 10px;
        }
        
        .content-section-body p {
          margin-bottom: 14px;
          text-align: justify;
          line-height: 1.7;
        }
        
        .content-section-body p:last-child {
          margin-bottom: 0;
        }
        
        .content-section-body ul {
          list-style: none;
          padding-left: 0;
          margin-bottom: 16px;
          margin-top: 8px;
        }
        
        .content-section-body ul:last-child {
          margin-bottom: 0;
        }
        
        .content-section-body li {
          margin-bottom: 14px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.8;
          text-align: justify;
        }
        
        .content-section-body li:last-child {
          margin-bottom: 0;
        }
        
        .content-section-body li::before {
          content: '✓';
          font-size: 16px;
          margin-right: 8px;
          color: #10b981;
          font-weight: bold;
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .content-section-body ol.numbered-questions {
          list-style: none;
          padding-left: 0;
          margin-bottom: 16px;
          margin-top: 8px;
        }
        
        .content-section-body ol.numbered-questions:last-child {
          margin-bottom: 0;
        }
        
        .content-section-body li.numbered-question {
          margin-bottom: 16px;
          font-style: italic;
          color: #4b5563;
          line-height: 1.8;
          padding-left: 24px;
          position: relative;
        }
        
        .content-section-body li.numbered-question:last-child {
          margin-bottom: 0;
        }
        
        .content-section-body li.numbered-question::before {
          content: attr(data-number);
          position: absolute;
          left: 0;
          font-weight: 600;
          color: #4f46e5;
          font-style: normal;
        }
        
        /* Melhora espaçamento entre parágrafos */
        .content-section-body p + p {
          margin-top: 14px;
        }
        
        /* Melhora quebras de linha dentro de parágrafos */
        .content-section-body p br {
          line-height: 1.8;
        }
        
        /* Estilos para subseções de Lateralidade */
        .content-section-body p.lateralidade-subsection {
          font-weight: 600;
          color: #1f2937;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        
        .content-section-body p.lateralidade-subsection:first-child {
          margin-top: 0;
        }
        
        .content-section-body p.lateralidade-warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 10px 12px;
          margin: 14px 0;
          border-radius: 4px;
          font-weight: 600;
          color: #92400e;
        }
        
        .content-section-body p.lateralidade-tip {
          background: #ecfdf5;
          border-left: 4px solid #10b981;
          padding: 10px 12px;
          margin: 14px 0;
          border-radius: 4px;
          font-weight: 600;
          color: #065f46;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
        
        .footer-logo {
          font-size: 20px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 15px;
        }
        
        .footer-logo .highlight {
          color: #fbbf24;
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
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          me<span class="highlight">DIZ</span>!
        </div>
        ${data.therapistName ? `<div class="therapist-name">${escapeHtml(data.therapistName)}</div>` : ''}
        <div class="title">${translations.reportTitle}</div>
      </div>
      
      <div class="metadata">
        ${data.patientName ? `
        <div class="metadata-item">
          <span class="metadata-label">👤 ${translations.patient}</span>
          <span class="metadata-value">${escapeHtml(data.patientName)}</span>
        </div>
        ` : ''}
        <div class="metadata-item">
          <span class="metadata-label">📅 ${translations.date}</span>
          <span class="metadata-value">${formattedDate}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">🕐 ${translations.time}</span>
          <span class="metadata-value">${formattedTime}</span>
        </div>
      </div>
      
      <div class="question-section">
        <div class="section-title">${translations.symptom}</div>
        <div class="question-content">
          ${escapeHtml(data.question)}
        </div>
      </div>
      
      <div class="answer-section">
        <div class="section-title">💡 ${translations.response}</div>
        <div class="answer-content">
          ${processedAnswer || '<p>Conteúdo não disponível.</p>'}
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-logo">
          me<span class="highlight">DIZ</span>!
        </div>
        <div class="disclaimer">
          ${translations.disclaimer}
        </div>
        <div style="margin-top: 12px;">
          © ${new Date().getFullYear()} ${translations.copyright}
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Traduções por idioma
 */
function getTranslations(language: LanguageCode) {
  const translations: Record<LanguageCode, {
    reportTitle: string
    symptom: string
    response: string
    patient: string
    date: string
    time: string
    disclaimer: string
    copyright: string
  }> = {
    'pt-BR': {
      reportTitle: 'Relatório de Origem Emocional',
      symptom: 'Sintoma',
      response: 'Resposta',
      patient: 'Paciente:',
      date: 'Data:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Sempre consulte um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
      copyright: 'Relatório de Origem Emocional'
    },
    'pt-PT': {
      reportTitle: 'Relatório de Origem Emocional',
      symptom: 'Sintoma',
      response: 'Resposta',
      patient: 'Paciente:',
      date: 'Data:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Consulte sempre um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
      copyright: 'Relatório de Origem Emocional'
    },
    en: {
      reportTitle: 'Emotional Origin Report',
      symptom: 'Symptom',
      response: 'Response',
      patient: 'Patient:',
      date: 'Date:',
      time: 'Time:',
      disclaimer: '⚠️ Important: Always consult a qualified health professional before making decisions related to your health.',
      copyright: 'Emotional Origin Report'
    },
    es: {
      reportTitle: 'Informe de Origen Emocional',
      symptom: 'Síntoma',
      response: 'Respuesta',
      patient: 'Paciente:',
      date: 'Fecha:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Siempre consulte a un profesional de salud cualificado antes de tomar decisiones relacionadas con su salud.',
      copyright: 'Informe de Origen Emocional'
    }
  }

  return translations[language] || translations['pt-BR']
}

/**
 * Prefixo do nome do arquivo por idioma
 */
function getFilenamePrefix(language: LanguageCode): string {
  const prefixes: Record<LanguageCode, string> = {
    'pt-BR': 'relatorio-de-origem-emocional',
    'pt-PT': 'relatorio-de-origem-emocional',
    en: 'emotional-origin-report',
    es: 'informe-de-origen-emocional'
  }
  return prefixes[language] || prefixes['pt-BR']
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
 */
function escapeHtml(text: string): string {
  if (!text) return ''
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

import html2pdf from 'html2pdf.js'
import { logger } from '@/lib/logger'
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
 * Preserva formatação HTML e inclui metadados organizados
 */
export async function generateChatPDF(data: PDFData): Promise<void> {
  try {
    // Logs que funcionam em produção também
    console.log('[PDF Generator] 🔍 Dados recebidos:', {
      question: data.question?.substring(0, 50) || 'SEM PERGUNTA',
      answerLength: data.answer?.length || 0,
      hasAnswer: !!data.answer,
      answerPreview: data.answer?.substring(0, 100) || 'VAZIO',
      timestamp: data.timestamp.toISOString(),
      environment: typeof window !== 'undefined' ? 'client' : 'server',
      nodeEnv: process.env.NODE_ENV
    })
    
    logger.debug('🔍 Debug PDF - Dados recebidos', '[pdfGenerator]', {
      question: data.question,
      answerLength: data.answer?.length || 0,
      hasAnswer: !!data.answer,
      timestamp: data.timestamp.toISOString()
    })
    
    // Debug específico para IMPACTO BIOLÓGICO
    logger.debug('🔍 Debug PDF - Answer content preview', '[pdfGenerator]', { preview: data.answer?.substring(0, 200) })
    logger.debug('🔍 Debug PDF - Answer contains IMPACTO BIOLÓGICO', '[pdfGenerator]', { contains: data.answer?.includes('IMPACTO BIOLÓGICO') })
    logger.debug('🔍 Debug PDF - Answer contains **IMPACTO BIOLÓGICO**', '[pdfGenerator]', { contains: data.answer?.includes('**IMPACTO BIOLÓGICO**') })

    // Validação crítica: verifica se answer existe
    if (!data.answer || data.answer.trim().length === 0) {
      console.error('[PDF Generator] ❌ ERRO CRÍTICO: Answer está vazio ou undefined!', {
        answer: data.answer,
        answerType: typeof data.answer,
        answerLength: data.answer?.length
      })
      throw new Error('Answer está vazio - não é possível gerar PDF sem conteúdo')
    }

    // Cria o HTML que será convertido para PDF
    const htmlContent = createPDFHTML(data)
    
    console.log('[PDF Generator] 🔍 HTML gerado:', {
      htmlLength: htmlContent?.length || 0,
      hasAnswerContent: htmlContent?.includes('answer-content') || false,
      hasProcessedAnswer: htmlContent?.includes('RESPOSTA') || htmlContent?.includes('Response') || false,
      answerContentPreview: htmlContent?.substring(htmlContent.indexOf('answer-content'), htmlContent.indexOf('answer-content') + 500) || 'NÃO ENCONTRADO'
    })
    
    logger.debug('🔍 Debug PDF - HTML gerado', '[pdfGenerator]', {
      htmlLength: htmlContent?.length || 0,
      hasContent: htmlContent?.includes('answer-content') || false
    })
    
    // Configurações do PDF otimizadas para produção
    const language = data.language || 'pt-BR'
    const filenamePrefix = REPORT_FILENAME_TRANSLATIONS[language] || REPORT_FILENAME_TRANSLATIONS['pt-BR']
    
    // Configurações otimizadas do html2canvas para produção
    // useCORS: false em produção pode ajudar com problemas de CORS
    // logging: false reduz logs desnecessários em produção
    const isProduction = process.env.NODE_ENV === 'production'
    
    const options = {
      margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
      filename: `${filenamePrefix}-${formatDateForFilename(data.timestamp)}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: !isProduction, // Em produção, tenta sem CORS primeiro
        letterRendering: true,
        allowTaint: isProduction, // Em produção, permite taint para evitar problemas de CORS
        backgroundColor: '#ffffff',
        logging: !isProduction, // Desabilita logs em produção
        windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
        windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1600,
        // Configurações adicionais para produção
        removeContainer: true,
        imageTimeout: 15000, // Timeout maior para imagens em produção
        onclone: (clonedDoc: any) => {
          // Garante que o HTML clonado tenha todas as fontes carregadas
          console.log('[PDF Generator] html2canvas - Clonando documento para renderização')
          return clonedDoc
        }
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait' as const,
        compress: true
      }
    }
    
    console.log('[PDF Generator] 🔍 Configurações do PDF:', {
      isProduction,
      useCORS: options.html2canvas.useCORS,
      allowTaint: options.html2canvas.allowTaint,
      logging: options.html2canvas.logging
    })

    logger.debug('🔍 Debug PDF - Iniciando geração...')
    console.log('[PDF Generator] 🔍 Iniciando geração do PDF com html2pdf...', {
      options: {
        filename: options.filename,
        scale: options.html2canvas.scale,
        useCORS: options.html2canvas.useCORS
      }
    })
    
    // Gera e baixa o PDF
    // IMPORTANTE: Em produção, html2pdf pode ter problemas ao renderizar HTML string diretamente
    // Criamos um elemento DOM temporário para garantir renderização correta
    try {
      if (typeof window === 'undefined') {
        throw new Error('generateChatPDF deve ser executado no cliente (browser)')
      }

      // Cria um elemento temporário para renderizar o HTML
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm' // Largura A4
      tempDiv.style.padding = '20px'
      tempDiv.innerHTML = htmlContent
      
      // Adiciona ao DOM temporariamente
      document.body.appendChild(tempDiv)
      
      console.log('[PDF Generator] 🔍 Elemento temporário criado:', {
        hasElement: !!tempDiv,
        innerHTMLLength: tempDiv.innerHTML.length,
        hasAnswerContent: tempDiv.innerHTML.includes('answer-content')
      })

      try {
        // Renderiza o elemento DOM ao invés do HTML string
        await html2pdf()
          .set(options)
          .from(tempDiv)
          .save()
        
        console.log('[PDF Generator] ✅ PDF gerado com sucesso!')
        logger.debug('✅ Debug PDF - PDF gerado com sucesso!')
      } finally {
        // Remove o elemento temporário
        document.body.removeChild(tempDiv)
        console.log('[PDF Generator] 🔍 Elemento temporário removido')
      }
    } catch (html2pdfError) {
      console.error('[PDF Generator] ❌ Erro ao gerar PDF com html2pdf:', {
        error: html2pdfError,
        errorMessage: html2pdfError instanceof Error ? html2pdfError.message : String(html2pdfError),
        errorStack: html2pdfError instanceof Error ? html2pdfError.stack : undefined,
        htmlLength: htmlContent.length,
        hasAnswerContent: htmlContent.includes('answer-content'),
        isClient: typeof window !== 'undefined'
      })
      throw html2pdfError
    }
  } catch (error) {
    logger.error('❌ Erro ao gerar PDF:', error)
    throw new Error('Falha na geração do PDF')
  }
}

/**
 * Processa e organiza o conteúdo HTML da resposta para melhor formatação no PDF
 * Versão simplificada e robusta para evitar seções vazias
 */
function processAnswerContent(htmlContent: string, language: LanguageCode = 'pt-BR'): string {
  // Log que funciona em produção
  console.log('[PDF Generator] processAnswerContent - Iniciando processamento:', {
    contentLength: htmlContent?.length || 0,
    hasContent: !!htmlContent && htmlContent.trim().length > 0,
    contentPreview: htmlContent?.substring(0, 200) || 'VAZIO',
    language
  })
  
  // Se o conteúdo estiver vazio, retorna uma mensagem padrão
  if (!htmlContent || htmlContent.trim().length === 0) {
    console.warn('[PDF Generator] processAnswerContent - ⚠️ Conteúdo vazio, retornando mensagem padrão')
    return '<p style="margin-bottom: 10px; text-align: justify; line-height: 1.5;">Conteúdo não disponível.</p>'
  }

  // CRÍTICO: Extrai conteúdo do iframe srcdoc antes de limpar
  // O conteúdo real está dentro do atributo srcdoc do iframe
  let extractedContent = htmlContent
  
  // Tenta encontrar iframe com srcdoc (pode ter aspas simples ou duplas)
  const iframePatterns = [
    /<iframe[^>]*srcdoc=["']([^"']*)["'][^>]*>/i,
    /<iframe[^>]*srcdoc=([^\s>]+)[^>]*>/i
  ]
  
  for (const pattern of iframePatterns) {
    const match = htmlContent.match(pattern)
    if (match && match[1]) {
      let srcdocContent = match[1]
      
      // Remove aspas do início e fim se existirem
      srcdocContent = srcdocContent.replace(/^["']|["']$/g, '')
      
      // Decodifica entidades HTML comuns
      srcdocContent = srcdocContent
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
      
      // Tenta decodificar URI se necessário
      try {
        const decoded = decodeURIComponent(srcdocContent)
        extractedContent = decoded
        break
      } catch {
        // Se falhar, usa o conteúdo já processado
        extractedContent = srcdocContent
        break
      }
    }
  }
  
  // Se não encontrou iframe, usa o conteúdo original
  // Mas verifica se há conteúdo útil (não apenas tags vazias)
  if (extractedContent === htmlContent && htmlContent.includes('<iframe')) {
    // Se ainda tem iframe mas não extraiu, tenta método alternativo
    // Remove apenas as tags iframe mas mantém qualquer conteúdo interno
    extractedContent = htmlContent.replace(/<iframe[^>]*>([\s\S]*?)<\/iframe>/gi, '$1')
  }

  // DEBUG: Log em desenvolvimento para rastrear conteúdo problemático
  if (process.env.NODE_ENV === 'development' && (htmlContent.includes('sandbox') || htmlContent.includes('<iframe'))) {
    logger.debug('[pdfGenerator] processAnswerContent - Conteúdo contém HTML literal:', htmlContent.substring(0, 200))
  }

  // PRIMEIRO: Limpa HTML literal problemático antes de processar
  const cleanedContent = cleanHtmlLiteralsForPDF(extractedContent)

  // Primeiro, tenta extrair "Contexto Geral" e "Impacto Biológico" usando a mesma lógica do parseResponse
  // Essas seções podem aparecer com dois pontos após o título
  function findField(fieldNames: string[]): { title: string; content: string } | null {
    for (const fieldName of fieldNames) {
      const escaped = fieldName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      // Procura por **Título:** ou **Título** seguido de conteúdo
      const pattern = new RegExp(`\\*\\*${escaped}:?\\*\\*:?\\s*([\\s\\S]*?)(?=\\r?\\n\\*\\*|$)`, 'i')
      const match = cleanedContent.match(pattern)
      if (match && match[1]?.trim()) {
        return { title: fieldName, content: match[1].trim() }
      }
    }
    return null
  }

  // Extrai Contexto Geral e Impacto Biológico primeiro
  const contextoGeral = findField(['Contexto Geral', 'Contexto General', 'General Context'])
  const impactoBiologico = findField(['Impacto Biológico', 'Biological Impact'])

  // Versão simplificada: divide por quebras de linha e processa cada parte
  const lines = cleanedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  let result = ''
  let currentSection = ''
  let currentSectionPtTitle = '' // Título em PT (padrão)
  let contentBeforeFirstSection = '' // Conteúdo antes da primeira seção detectada
  let hasFoundFirstSection = false // Flag para saber se já encontramos a primeira seção
  
  // Flags para evitar duplicar Contexto Geral e Impacto Biológico
  let hasAddedContextoGeral = false
  let hasAddedImpactoBiologico = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Verifica se é um título de seção
    if (isSectionTitle(line)) {
      // Verificação especial para "LATERALIDADE DEPENDE..." - deve ser tratado como conteúdo
      const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').trim().toUpperCase()
      if (cleanLine.includes('LATERALIDADE') && cleanLine.includes('DEPENDE')) {
        if (hasFoundFirstSection) {
          if (currentSection) {
            currentSection += '\n' + line
          } else {
            currentSection = line
          }
        } else {
          if (contentBeforeFirstSection) {
            contentBeforeFirstSection += '\n' + line
          } else {
            contentBeforeFirstSection = line
          }
        }
        continue
      }
      
      // Extrai o título limpo (sem markdown)
      const cleanTitle = line.replace(/\*\*/g, '').replace(/:/g, '').trim()
      
      // Verifica se é Contexto Geral ou Impacto Biológico
      const matchedPtTitle = findMatchingSection(cleanTitle)
      
      // Se for Contexto Geral ou Impacto Biológico e já extraímos separadamente, pula
      if (matchedPtTitle === 'Contexto Geral' && contextoGeral && !hasAddedContextoGeral) {
        // Se havia conteúdo antes, adiciona à seção de Contexto Geral
        if (contentBeforeFirstSection.trim()) {
          result += createSectionHTML('Contexto Geral', contentBeforeFirstSection.trim() + '\n\n' + contextoGeral.content, language)
        } else {
          result += createSectionHTML('Contexto Geral', contextoGeral.content, language)
        }
        hasAddedContextoGeral = true
        hasFoundFirstSection = true
        contentBeforeFirstSection = ''
        currentSection = ''
        currentSectionPtTitle = ''
        continue
      }
      
      if (matchedPtTitle === 'Impacto Biológico' && impactoBiologico && !hasAddedImpactoBiologico) {
        // Se havia conteúdo antes, adiciona à seção anterior ou cria uma seção genérica
        if (contentBeforeFirstSection.trim() && !hasFoundFirstSection) {
          result += createSectionHTML('RESPOSTA', contentBeforeFirstSection.trim(), language)
          contentBeforeFirstSection = ''
        }
        result += createSectionHTML('Impacto Biológico', impactoBiologico.content, language)
        hasAddedImpactoBiologico = true
        hasFoundFirstSection = true
        currentSection = ''
        currentSectionPtTitle = ''
        continue
      }
      
      // Se é a primeira seção encontrada e há conteúdo antes, adiciona como seção genérica
      if (!hasFoundFirstSection && contentBeforeFirstSection.trim()) {
        result += createSectionHTML('RESPOSTA', contentBeforeFirstSection.trim(), language)
        contentBeforeFirstSection = ''
        hasFoundFirstSection = true
      }
      
      // Salva seção anterior se tiver conteúdo
      if (currentSectionPtTitle && currentSection.trim()) {
        result += createSectionHTML(currentSectionPtTitle, currentSection.trim(), language)
      }
      
      // Inicia nova seção
      currentSectionPtTitle = matchedPtTitle || cleanTitle // Usa PT se encontrou match, senão usa o original
      currentSection = ''
      hasFoundFirstSection = true
      
      // Pula apenas barras horizontais que aparecem logo após o título
      if (i + 1 < lines.length && /^[-=_]{2,}$/.test(lines[i + 1].trim())) {
        i++ // Pula a barra horizontal
      }
    } else {
      // Adiciona conteúdo à seção atual ou ao conteúdo antes da primeira seção
      if (hasFoundFirstSection) {
        if (currentSection) {
          currentSection += '\n' + line
        } else {
          currentSection = line
        }
      } else {
        if (contentBeforeFirstSection) {
          contentBeforeFirstSection += '\n' + line
        } else {
          contentBeforeFirstSection = line
        }
      }
    }
  }
  
  // Adiciona a última seção
  if (currentSectionPtTitle && currentSection.trim()) {
    result += createSectionHTML(currentSectionPtTitle, currentSection.trim(), language)
  } else if (currentSection.trim()) {
    // Se não tem título mas tem conteúdo, cria seção geral
    result += createSectionHTML('RESPOSTA', currentSection.trim(), language)
  } else if (contentBeforeFirstSection.trim() && !hasFoundFirstSection) {
    // Se não encontrou nenhuma seção mas tem conteúdo, cria seção genérica
    result += createSectionHTML('RESPOSTA', contentBeforeFirstSection.trim(), language)
  }

  // Se não gerou nada, pelo menos mostra o conteúdo original (já limpo)
  if (result.trim().length === 0) {
    console.warn('[PDF Generator] processAnswerContent - ⚠️ Resultado vazio após processamento, usando conteúdo limpo')
    result = createSectionHTML('RESPOSTA', cleanedContent.trim(), language)
  }

  console.log('[PDF Generator] processAnswerContent - Processamento concluído:', {
    resultLength: result?.length || 0,
    hasResult: result.trim().length > 0,
    resultPreview: result?.substring(0, 200) || 'VAZIO'
  })

  return result
}

/**
 * Normaliza strings (remove acentos, pontuação, converte para lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove pontuação e caracteres especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim()
}

/**
 * Extrai palavras-chave principais de um título
 */
function extractKeywords(normalized: string): string[] {
  // Remove palavras comuns (stop words)
  const stopWords = ['the', 'of', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'do', 'da', 'de', 'do', 'das', 'dos', 'del', 'el', 'la', 'los', 'las']
  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .sort()
}

/**
 * Calcula similaridade entre dois conjuntos de palavras-chave
 */
function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0
  
  const set1 = new Set(keywords1)
  const set2 = new Set(keywords2)
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  // Jaccard similarity
  return intersection.size / union.size
}

/**
 * Mapeamento de seções conhecidas (mesmo do parseResponse)
 * Inclui Contexto Geral e Impacto Biológico que são processados separadamente no frontend
 */
const sectionTitlesMap: Record<string, string[]> = {
  'Contexto Geral': [
    'Contexto Geral',
    'Contexto General',
    'General Context'
  ],
  'Impacto Biológico': [
    'Impacto Biológico',
    'Biological Impact'
  ],
  'Símbolos Biológicos': ['Símbolos Biológicos', 'Biological Symbols', 'Biological Symbol'],
  'Conflito Emocional Subjacente': ['Conflito Emocional Subjacente', 'Conflicto Emocional Subyacente', 'Underlying Emotional Conflict'],
  'Experiências comuns': ['Experiências comuns', 'Experiencias comunes', 'Common Experiences'],
  'Padrões de comportamento': ['Padrões de comportamento', 'Patrones de comportamiento', 'Behavior Patterns', 'Behavioral Patterns'],
  'Impacto Transgeracional': ['Impacto Transgeracional', 'Impacto Transgeneracional', 'Transgenerational Impact'],
  'Lateralidade': ['Lateralidade', 'Lateralidad', 'Laterality'],
  'Fases da doença': ['Fases da doença', 'Fases de la enfermedad', 'Disease Phases', 'Phases of the Condition'],
  'Possíveis doenças correlacionadas': [
    'Possíveis doenças correlacionadas',
    'Posibles enfermedades correlacionadas',
    'Possible Correlated Diseases',
    'Possible Related Conditions',
    'Possible Correlated Conditions'
  ],
  'Perguntas Reflexivas': ['Perguntas Reflexivas', 'Preguntas Reflexivas', 'Reflective Questions'],
  'Chave Terapêutica do [RE]Sentir': [
    'Chave Terapêutica do [RE]Sentir',
    'Clave Terapéutica del [RE]Sentir',
    'Therapeutic Key of [RE]Feeling',
    'Therapeutic Key of [RE]Sentir',
    '[RE]Sentir Therapeutic Key'
  ]
}

/**
 * Mapeamento de tradução do título do relatório
 */
const REPORT_TITLE_TRANSLATIONS: Record<LanguageCode, string> = {
  'pt-BR': 'Relatório de Origem Emocional',
  'pt-PT': 'Relatório de Origem Emocional',
  en: 'Emotional Origin Report',
  es: 'Informe de Origen Emocional'
}

/**
 * Mapeamento de tradução do nome do arquivo PDF
 */
const REPORT_FILENAME_TRANSLATIONS: Record<LanguageCode, string> = {
  'pt-BR': 'relatorio-de-origem-emocional',
  'pt-PT': 'relatorio-de-origem-emocional',
  en: 'emotional-origin-report',
  es: 'informe-de-origen-emocional'
}

/**
 * Mapeamento de tradução das seções do PDF
 */
const PDF_SECTION_TRANSLATIONS: Record<LanguageCode, { symptom: string; response: string; patient: string; date: string; time: string }> = {
  'pt-BR': {
    symptom: 'Sintoma',
    response: 'Resposta',
    patient: 'Paciente:',
    date: 'Data:',
    time: 'Hora:'
  },
  'pt-PT': {
    symptom: 'Sintoma',
    response: 'Resposta',
    patient: 'Paciente:',
    date: 'Data:',
    time: 'Hora:'
  },
  en: {
    symptom: 'Symptom',
    response: 'Response',
    patient: 'Patient:',
    date: 'Date:',
    time: 'Time:'
  },
  es: {
    symptom: 'Síntoma',
    response: 'Respuesta',
    patient: 'Paciente:',
    date: 'Fecha:',
    time: 'Hora:'
  }
}

/**
 * Mapeamento de tradução do footer do PDF (disclaimer e copyright)
 */
const PDF_FOOTER_TRANSLATIONS: Record<LanguageCode, { disclaimer: string; copyright: string }> = {
  'pt-BR': {
    disclaimer: '⚠️ Importante: Sempre consulte um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
    copyright: 'Relatório de Origem Emocional'
  },
  'pt-PT': {
    disclaimer: '⚠️ Importante: Consulte sempre um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
    copyright: 'Relatório de Origem Emocional'
  },
  en: {
    disclaimer: '⚠️ Important: Always consult a qualified health professional before making decisions related to your health.',
    copyright: 'Emotional Origin Report'
  },
  es: {
    disclaimer: '⚠️ Importante: Siempre consulte a un profesional de salud cualificado antes de tomar decisiones relacionadas con su salud.',
    copyright: 'Informe de Origen Emocional'
  }
}

/**
 * Mapeamento de tradução dos títulos das seções (mesmo do result.tsx)
 */
const SECTION_TITLE_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  'Contexto Geral': {
    'pt-BR': 'Contexto Geral',
    'pt-PT': 'Contexto Geral',
    en: 'General Context',
    es: 'Contexto General'
  },
  'Impacto Biológico': {
    'pt-BR': 'Impacto Biológico',
    'pt-PT': 'Impacto Biológico',
    en: 'Biological Impact',
    es: 'Impacto Biológico'
  },
  'Símbolos Biológicos': {
    'pt-BR': 'Símbolos Biológicos',
    'pt-PT': 'Símbolos Biológicos',
    en: 'Biological Symbols',
    es: 'Símbolos Biológicos'
  },
  'Conflito Emocional Subjacente': {
    'pt-BR': 'Conflito Emocional Subjacente',
    'pt-PT': 'Conflito Emocional Subjacente',
    en: 'Underlying Emotional Conflict',
    es: 'Conflicto Emocional Subyacente'
  },
  'Experiências comuns': {
    'pt-BR': 'Experiências comuns',
    'pt-PT': 'Experiências comuns',
    en: 'Common Experiences',
    es: 'Experiencias comunes'
  },
  'Padrões de comportamento': {
    'pt-BR': 'Padrões de comportamento',
    'pt-PT': 'Padrões de comportamento',
    en: 'Behavior Patterns',
    es: 'Patrones de comportamiento'
  },
  'Impacto Transgeracional': {
    'pt-BR': 'Impacto Transgeracional',
    'pt-PT': 'Impacto Transgeracional',
    en: 'Transgenerational Impact',
    es: 'Impacto Transgeneracional'
  },
  'Lateralidade': {
    'pt-BR': 'Lateralidade',
    'pt-PT': 'Lateralidade',
    en: 'Laterality',
    es: 'Lateralidad'
  },
  'Fases da doença': {
    'pt-BR': 'Fases da doença',
    'pt-PT': 'Fases da doença',
    en: 'Disease Phases',
    es: 'Fases de la enfermedad'
  },
  'Possíveis doenças correlacionadas': {
    'pt-BR': 'Possíveis doenças correlacionadas',
    'pt-PT': 'Possíveis doenças correlacionadas',
    en: 'Possible Related Conditions',
    es: 'Posibles enfermedades correlacionadas'
  },
  'Perguntas Reflexivas': {
    'pt-BR': 'Perguntas Reflexivas',
    'pt-PT': 'Perguntas Reflexivas',
    en: 'Reflective Questions',
    es: 'Preguntas Reflexivas'
  },
  'Chave Terapêutica do [RE]Sentir': {
    'pt-BR': 'Chave Terapêutica do [RE]Sentir',
    'pt-PT': 'Chave Terapêutica do [RE]Sentir',
    en: 'Therapeutic Key of [RE]Feeling',
    es: 'Clave Terapéutica del [RE]Sentir'
  }
}

/**
 * Traduz título da seção para o idioma selecionado
 */
function translateSectionTitle(title: string, language: LanguageCode): string {
  return SECTION_TITLE_TRANSLATIONS[title]?.[language] || title
}

/**
 * Faz match inteligente de um título encontrado com as seções conhecidas
 */
function findMatchingSection(foundTitle: string): string | null {
  const normalizedFound = normalizeString(foundTitle)
  const keywordsFound = extractKeywords(normalizedFound)
  
  let bestMatch: { ptTitle: string; similarity: number } | null = null
  
  // Tenta match exato primeiro (mais rápido)
  for (const [ptTitle, variants] of Object.entries(sectionTitlesMap)) {
    for (const variant of variants) {
      if (normalizeString(variant) === normalizedFound) {
        return ptTitle
      }
    }
  }
  
  // Se não encontrou match exato, tenta match por similaridade
  for (const [ptTitle, variants] of Object.entries(sectionTitlesMap)) {
    for (const variant of variants) {
      const normalizedVariant = normalizeString(variant)
      const keywordsVariant = extractKeywords(normalizedVariant)
      const similarity = calculateSimilarity(keywordsFound, keywordsVariant)
      
      // Se a similaridade for alta (>= 0.5), considera um match
      if (similarity >= 0.5 && (!bestMatch || similarity > bestMatch.similarity)) {
        bestMatch = { ptTitle, similarity }
      }
    }
  }
  
  return bestMatch?.ptTitle || null
}

/**
 * Verifica se uma linha é um título de seção usando a mesma lógica do parseResponse
 */
function isSectionTitle(line: string): boolean {
  // Remove formatação markdown (**texto**, *texto*, etc.)
  const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/:/g, '').trim()
  
  // Ignora linhas muito curtas
  if (cleanLine.length < 3) {
    return false
  }
  
  // Lista de padrões que devem ser IGNORADOS (são parte do conteúdo, não títulos)
  const excludedPatterns = [
    /^#\d+$/i, // Números como "#1", "#2"
    /^(common situations include|situações comuns incluem|impacto sentido|impact felt|conflict of|conflicto de)/i,
    /^(right side|left side|lado direito|lado esquerdo)$/i,
    /^(active conflict phase|solution phase|epileptoid crisis|final repair phase|fase ativa|fase de solução|fase de reparo)/i,
    /^(simpaticotonia|pcl-a|pcl-b)$/i
  ]
  
  // Ignora padrões que são claramente parte do conteúdo
  if (excludedPatterns.some(pattern => pattern.test(cleanLine) || pattern.test(normalizeString(cleanLine)))) {
    return false
  }
  
  // Tenta fazer match com seções conhecidas
  const matchedPtTitle = findMatchingSection(cleanLine)
  
  return matchedPtTitle !== null
}

/**
 * Limpa HTML literal problemático do conteúdo antes de processar markdown para PDF
 * Remove atributos HTML e tags que não devem aparecer como texto
 * IMPORTANTE: Esta função é chamada APÓS extrair o conteúdo do srcdoc do iframe
 */
function cleanHtmlLiteralsForPDF(text: string): string {
  // Se o texto já foi extraído do iframe, não deve mais conter tags iframe
  // Mas ainda pode conter outros elementos problemáticos
  
  // Lista de padrões HTML problemáticos que devem ser removidos
  // Estes padrões aparecem como texto literal na página e devem ser removidos
  const problematicPatterns = [
    /sandbox="[^"]*"/gi,           // sandbox="allow-scripts..."
    /sandbox='[^']*'/gi,            // sandbox='allow-scripts...'
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi, // <iframe>...</iframe> completo (caso ainda exista)
    /<iframe[^>]*>/gi,               // <iframe ...> (tag de abertura)
    /<\/iframe>/gi,                  // </iframe> (tag de fechamento)
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
      logger.debug('[pdfGenerator] Removido padrão HTML problemático do PDF:', pattern.toString())
    }
  })
  
  return cleaned
}

/**
 * Processa conteúdo markdown para PDF (versão com estilos inline)
 */
function processMarkdownForPDF(content: string): string {
  if (!content || content.trim().length === 0) {
    return ''
  }

  // DEBUG: Log em desenvolvimento para rastrear conteúdo problemático
  if (process.env.NODE_ENV === 'development' && (content.includes('sandbox') || content.includes('<iframe'))) {
    logger.debug('[pdfGenerator] Conteúdo contém HTML literal antes de processar PDF:', content.substring(0, 200))
  }

  // 0. PRIMEIRO: Limpa HTML literal problemático que pode estar no conteúdo
  // Isso evita que HTML literal apareça como texto no PDF
  const cleanedContent = cleanHtmlLiteralsForPDF(content)

  // Lista de emojis separadores
  const PARAGRAPH_SEPARATORS = ['🌀', '📍', '💡', '🔍', '📌', '✨', '🔑', '⚡', '🌟', '🎯', '📊', '💭', '🧠', '🛡️', '⏳']
  
  function escapeRegex(str: string): string {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  }

  // 1. Primeiro converte markdown básico para HTML
  let processed = cleanedContent
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
  // Mas apenas se o emoji não estiver já no início de uma linha ou após uma quebra de linha
  PARAGRAPH_SEPARATORS.forEach(emoji => {
    // Adiciona quebra de linha dupla ANTES do emoji (se não estiver no início já)
    // Mas evita criar quebras duplas desnecessárias
    processed = processed.replace(
      new RegExp(`([^\\n\\r])(\\s*)(${escapeRegex(emoji)}\\s)`, 'g'),
      (match, before, spaces, emojiWithSpace) => {
        // Se já há quebra de linha antes, não adiciona outra
        if (before.endsWith('\n') || before.endsWith('\r')) {
          return match
        }
        return `${before}\n\n${emojiWithSpace}`
      }
    )
    
    // Se emoji está no início da linha mas logo após texto na mesma linha, adiciona quebra
    // Mas apenas se não estiver já após uma quebra de linha
    processed = processed.replace(
      new RegExp(`([^\\n\\r])(\\s*)(${escapeRegex(emoji)})`, 'g'),
      (match, before, spaces, emoji) => {
        // Se já há quebra de linha antes, não adiciona outra
        if (before.endsWith('\n') || before.endsWith('\r')) {
          return match
        }
        return `${before}\n\n${emoji}`
      }
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
function createSectionHTML(title: string, content: string, language: LanguageCode = 'pt-BR'): string {
  if (!content || content.trim().length === 0) return ''
  
  // Limpa o título removendo formatação markdown
  const cleanTitle = title.replace(/\*\*/g, '').replace(/\*/g, '').replace(/:/g, '').trim()
  
  // Traduz o título para o idioma selecionado (mesmo comportamento do chat)
  const translatedTitle = translateSectionTitle(cleanTitle, language)
  
  // Mantém o conteúdo original sem remover nada - apenas processa formatação
  // O título duplicado será tratado apenas visualmente (não removido do conteúdo)
  const cleanedContent = content.trim()
  
  // Usa a função de processamento que detecta emojis como separadores
  const paragraphHTML = processMarkdownForPDF(cleanedContent)
  
  return `
    <div class="content-section" style="margin-bottom: 25px; margin-top: 15px; page-break-inside: avoid !important; break-inside: avoid !important; orphans: 2; widows: 2; min-height: 50px;">
      <div class="section-header" style="display: flex; align-items: center; margin-bottom: 12px; page-break-inside: avoid !important; page-break-after: avoid !important; break-inside: avoid !important; break-after: avoid !important; orphans: 2; widows: 2;">
        <div class="section-bar" style="width: 4px; height: 20px; background: #4f46e5; margin-right: 8px; border-radius: 2px; flex-shrink: 0;"></div>
        <h2 class="section-title" style="font-size: 14px; font-weight: 600; color: #4f46e5; margin: 0; text-transform: uppercase; page-break-after: avoid !important; page-break-inside: avoid !important; page-break-before: avoid !important; break-after: avoid !important; break-inside: avoid !important; break-before: avoid !important; word-break: keep-all; overflow-wrap: break-word; orphans: 2; widows: 2;">
          ${translatedTitle}
        </h2>
      </div>
      <div class="section-content" style="padding-left: 12px; page-break-before: avoid !important; break-before: avoid !important; orphans: 2; widows: 2;">
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
  
  // Logs que funcionam em produção
  console.log('[PDF Generator] createPDFHTML - Iniciando criação do HTML:', {
    answerLength: data.answer?.length || 0,
    hasAnswer: !!data.answer,
    answerPreview: data.answer?.substring(0, 300) || 'VAZIO',
    language: data.language || 'pt-BR'
  })
  
  // DEBUG: Log do conteúdo antes de processar
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[pdfGenerator] createPDFHTML - Answer length', '[pdfGenerator]', { length: data.answer?.length || 0 })
    logger.debug('[pdfGenerator] createPDFHTML - Answer preview', '[pdfGenerator]', { preview: data.answer?.substring(0, 300) || 'vazio' })
  }
  
  // Processa o conteúdo da resposta para melhor organização
  const language = data.language || 'pt-BR'
  const processedAnswer = processAnswerContent(data.answer, language)
  
  console.log('[PDF Generator] createPDFHTML - Resposta processada:', {
    processedAnswerLength: processedAnswer?.length || 0,
    hasProcessedAnswer: processedAnswer.trim().length > 0,
    processedAnswerPreview: processedAnswer?.substring(0, 300) || 'VAZIO'
  })
  
  // DEBUG: Log do conteúdo processado
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[pdfGenerator] createPDFHTML - Processed answer length', '[pdfGenerator]', { length: processedAnswer?.length || 0 })
    logger.debug('[pdfGenerator] createPDFHTML - Processed answer preview', '[pdfGenerator]', { preview: processedAnswer?.substring(0, 300) || 'vazio' })
  }
  
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
        
        .therapist-name {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-top: 12px;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
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
        
        /* Previne quebra de seções e cabeçalhos - regras duplicadas removidas, já estão acima */
        
        .section-header {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          break-inside: avoid !important;
          break-after: avoid !important;
          orphans: 2;
          widows: 2;
        }
        
        .section-title {
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          page-break-before: avoid !important;
          break-after: avoid !important;
          break-inside: avoid !important;
          break-before: avoid !important;
          word-break: keep-all;
          overflow-wrap: break-word;
          orphans: 2;
          widows: 2;
        }
        
        .section-content {
          page-break-before: avoid !important;
          break-before: avoid !important;
          orphans: 2;
          widows: 2;
        }
        
        /* Garante que pelo menos 2 linhas fiquem juntas */
        .section-header + .section-content {
          page-break-before: avoid !important;
          break-before: avoid !important;
        }
        
        /* Previne quebra dentro de toda a seção */
        .content-section {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          orphans: 2;
          widows: 2;
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
          ${data.therapistName ? `
          <div class="therapist-name">
            ${escapeHtml(data.therapistName)}
          </div>
          ` : ''}
          <div class="title">${REPORT_TITLE_TRANSLATIONS[language] || REPORT_TITLE_TRANSLATIONS['pt-BR']}</div>
        </div>
        
        <div class="metadata" style="text-align: left; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #4f46e5;">
          <div class="metadata-list" style="display: flex; flex-direction: column; gap: 8px;">
            ${data.patientName ? `
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">👤 ${PDF_SECTION_TRANSLATIONS[language]?.patient || PDF_SECTION_TRANSLATIONS['pt-BR'].patient}</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${escapeHtml(data.patientName)}</span>
            </div>
            ` : ''}
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">📅 ${PDF_SECTION_TRANSLATIONS[language]?.date || PDF_SECTION_TRANSLATIONS['pt-BR'].date}</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${formattedDate}</span>
            </div>
            <div class="metadata-item" style="font-size: 13px;">
              <span class="metadata-label" style="font-weight: 600; color: #374151;">🕐 ${PDF_SECTION_TRANSLATIONS[language]?.time || PDF_SECTION_TRANSLATIONS['pt-BR'].time}</span>
              <span class="metadata-value" style="color: #6b7280; margin-left: 8px;">${formattedTime}</span>
            </div>
          </div>
        </div>
        
        <div class="question-section">
          <div class="section-title">${PDF_SECTION_TRANSLATIONS[language]?.symptom || PDF_SECTION_TRANSLATIONS['pt-BR'].symptom}</div>
          <div class="question-content">
            ${escapeHtml(data.question)}
          </div>
        </div>
        
        <div class="answer-section">
          <div class="section-title">💡 ${PDF_SECTION_TRANSLATIONS[language]?.response || PDF_SECTION_TRANSLATIONS['pt-BR'].response}</div>
          <div class="answer-content">
            ${processedAnswer}
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">
            me<span class="highlight">DIZ</span>!
          </div>
          <div class="disclaimer">
            ${PDF_FOOTER_TRANSLATIONS[language]?.disclaimer || PDF_FOOTER_TRANSLATIONS['pt-BR'].disclaimer}
          </div>
          <div style="margin-top: 12px;">
            © ${new Date().getFullYear()} ${PDF_FOOTER_TRANSLATIONS[language]?.copyright || PDF_FOOTER_TRANSLATIONS['pt-BR'].copyright}
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

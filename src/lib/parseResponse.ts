export default function parseResponse(md: string) {
  // escapa caracteres especiais para uso em RegExp
  function escapeRegex(str: string) {
    // Escapa todos os caracteres especiais, incluindo colchetes
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  // Função auxiliar para buscar campo em múltiplos idiomas
  function findField(fieldNames: string[]): string {
    for (const fieldName of fieldNames) {
      const escaped = escapeRegex(fieldName)
      const match = md.match(new RegExp(`\\*\\*${escaped}:?\\*\\*:?\\s*([\\s\\S]*?)(?=\\r?\\n\\*\\*|$)`, 'i'))
      if (match && match[1]?.trim()) {
        return match[1].trim()
      }
    }
    return ''
  }

  // Função para normalizar strings (remove acentos, pontuação, converte para lowercase)
  function normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove pontuação e caracteres especiais
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  // Função para extrair palavras-chave principais de um título
  function extractKeywords(normalized: string): string[] {
    // Remove palavras comuns (stop words)
    const stopWords = ['the', 'of', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'do', 'da', 'de', 'do', 'das', 'dos', 'del', 'el', 'la', 'los', 'las']
    return normalized
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .sort()
  }

  // Função para calcular similaridade entre dois conjuntos de palavras-chave
  function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0
    
    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    
    // Jaccard similarity
    return intersection.size / union.size
  }

  // Função para fazer match inteligente de um título encontrado com as seções conhecidas
  function findMatchingSection(foundTitle: string, sectionTitlesMap: Record<string, string[]>): string | null {
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

  type OtherItem = { title: string; body: string; icon: string | null; originalTitle?: string }

  // ——— CAMPOS ESPECÍFICOS ———
  // 1) Nome do Sistema: primeira linha em negrito
  const system = md.match(/^\*\*(.+?)\*\*/m)?.[1].trim() || ''

  // 2) Nome Científico (multi-idioma)
  const scientific = findField([
    'Nome Científico',
    'Nome Científico da condição',
    'Nombre Científico',
    'Nombre Científico de la condición',
    'Scientific Name',
    'Scientific Name of the Condition'
  ])

  // 3) Nome Popular (multi-idioma)
  const popular = findField([
    'Nome Popular',
    'Nombre Popular',
    'Popular Name',
    'Common Name'
  ])

  // 4) Contexto Geral (multi-idioma)
  const contextoGeral = findField([
    'Contexto Geral',
    'Contexto General',
    'General Context'
  ])

  // 5) Impacto Biológico (multi-idioma)
  const impactoBiologico = findField([
    'Impacto Biológico',
    'Biological Impact'
  ])

  // ——— DEMais SEÇÕES ———
  // Mapeamento de seções conhecidas (chave: título em PT, valor: exemplos de títulos em todos os idiomas)
  const sectionTitlesMap: Record<string, string[]> = {
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

  const sectionIconMap: Record<string, string> = {
    'Símbolos Biológicos': 'dna',
    'Conflito Emocional Subjacente': 'triangle-alert',
    'Experiências comuns': 'lightbulb',
    'Padrões de comportamento': 'brain',
    'Impacto Transgeracional': 'workflow',
    Lateralidade: 'arrow-right-left',
    'Fases da doença': 'chart-line',
    'Possíveis doenças correlacionadas': 'activity',
    'Perguntas Reflexivas': 'circle-question-mark',
    'Chave Terapêutica do [RE]Sentir': 'heart-pulse'
  }

  const others: OtherItem[] = []
  
  // ESTRATÉGIA GLOBAL: Extrai apenas títulos que correspondem às seções conhecidas
  // Primeiro, tenta fazer match exato com as seções conhecidas
  const sectionTitles: Array<{ original: string; normalized: string; index: number; ptTitle: string | null }> = []
  
  // Lista de textos em negrito que devem ser IGNORADOS (são parte do conteúdo, não títulos)
  const excludedPatterns = [
    /^#\d+$/i, // Números como "#1", "#2"
    /^(common situations include|situações comuns incluem|impacto sentido|impact felt|conflict of|conflicto de)/i,
    /^(right side|left side|lado direito|lado esquerdo)$/i,
    /^(active conflict phase|solution phase|epileptoid crisis|final repair phase|fase ativa|fase de solução|fase de reparo)/i,
    /^(simpaticotonia|pcl-a|pcl-b)$/i
  ]
  
  // Extrai todos os textos em negrito
  const allBoldMatches = md.match(/\*\*([^*]+?)\*\*/g) || []
  
  for (const boldMatch of allBoldMatches) {
    const title = boldMatch.replace(/\*\*/g, '').replace(/:/g, '').trim()
    const normalized = normalizeString(title)
    
    // Ignora títulos muito curtos
    if (title.length < 3) {
      continue
    }
    
    // Ignora padrões que são claramente parte do conteúdo
    if (excludedPatterns.some(pattern => pattern.test(title) || pattern.test(normalized))) {
      continue
    }
    
    // Tenta fazer match com seções conhecidas
    const matchedPtTitle = findMatchingSection(title, sectionTitlesMap)
    
    // Só adiciona se encontrou match com uma seção conhecida
    if (matchedPtTitle) {
      const index = md.indexOf(boldMatch)
      sectionTitles.push({ original: title, normalized, index, ptTitle: matchedPtTitle })
    }
  }
  
  // Remove duplicatas (mantém apenas a primeira ocorrência de cada seção)
  const uniqueSections = new Map<string, { original: string; index: number; ptTitle: string }>()
  for (const { original, normalized: _normalized, index, ptTitle } of sectionTitles) {
    if (ptTitle && !uniqueSections.has(ptTitle)) {
      uniqueSections.set(ptTitle, { original, index, ptTitle })
    }
  }
  
  // Ordena por ordem de aparição no markdown
  const sortedTitles = Array.from(uniqueSections.values())
    .sort((a, b) => a.index - b.index)
  
  // Processa cada título encontrado
  for (let i = 0; i < sortedTitles.length; i++) {
    const { original: foundTitle, ptTitle: matchedPtTitle } = sortedTitles[i]
    const nextTitle = sortedTitles[i + 1]
    
    if (!matchedPtTitle) {
      continue // Pula se não encontrou match
    }
    
    // Prepara regex para capturar o conteúdo da seção
    const titleEsc = escapeRegex(foundTitle)
    const nextTitleEsc = nextTitle ? escapeRegex(nextTitle.original) : null
    
    // Regex multilinha que captura a seção
    const pattern = new RegExp(
      [
        `\\*\\*${titleEsc}(?::)?\\*\\*:?`, // cabeçalho
        `\\s*([\\s\\S]*?)`, // corpo (lazy)
        nextTitleEsc
          ? `(?=\\*\\*${nextTitleEsc}(?::)?\\*\\*:?)` // lookahead para próximo cabeçalho
          : `(?=$)` // ou fim da string
      ].join(''),
      'mi'
    )
    
    const m = md.match(pattern)
    if (m) {
      const body = m[1].trim()
      
      // Só adiciona se tiver conteúdo
      if (body.length > 0) {
        others.push({
          title: matchedPtTitle,
          originalTitle: foundTitle,
          body: body,
          icon: sectionIconMap[matchedPtTitle] || null
        })
      }
    }
  }

  return {
    system,
    scientific,
    popular,
    contextoGeral,
    impactoBiologico,
    others
  }
}

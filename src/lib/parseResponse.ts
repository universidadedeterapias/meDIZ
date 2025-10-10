export default function parseResponse(md: string) {
  // escapa caracteres especiais para uso em RegExp
  function escapeRegex(str: string) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  type OtherItem = { title: string; body: string; icon: string | null }

  // ——— CAMPOS ESPECÍFICOS ———
  // 1) Nome do Sistema: primeira linha em negrito
  const system = md.match(/^\*\*(.+?)\*\*/m)?.[1].trim() || ''

  // 2) Nome Científico
  const scientific =
    md
      .match(/\*\*Nome Científico:\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  // 3) Nome Popular
  const popular =
    md
      .match(/\*\*Nome Popular:\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  // 4) Contexto Geral
  const contextoGeral =
    md
      .match(/\*\*Contexto Geral:\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  // 5) Impacto Biológico
  const impactoBiologico =
    md
      .match(/\*\*Impacto Biológico:\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  // ——— DEMais SEÇÕES ———
  const sectionTitles = [
    'Símbolos Biológicos',
    'Conflito Emocional Subjacente',
    'Experiências comuns',
    'Padrões de comportamento',
    'Impacto Transgeracional',
    'Lateralidade',
    'Fases da doença',
    'Possíveis doenças correlacionadas',
    'Perguntas Reflexivas',
    'Chave Terapêutica do [RE]Sentir'
  ] as const

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

  sectionTitles.forEach((rawTitle, i) => {
    const cleanTitle = rawTitle
    const titleEsc = escapeRegex(cleanTitle)
    const lookaheadRaw = sectionTitles[i + 1]
    const lookaheadEsc = lookaheadRaw ? escapeRegex(lookaheadRaw) : null

    // Regex multilinha que captura:
    //  - **Título** ou **Título:** ou **Título**: ou **Título:**
    // e termina antes do próximo **Próxima Seção** (também suportando ambos formatos de duas pontuações)
    const pattern = new RegExp(
      [
        `^\\*\\*${titleEsc}(?::)?\\*\\*:?`, // cabeçalho com colon opcional dentro e fora do bold
        `\\s*([\\s\\S]*?)`, // corpo (lazy)
        lookaheadEsc
          ? `(?=^\\*\\*${lookaheadEsc}(?::)?\\*\\*:?)` // lookahead para próximo cabeçalho
          : `(?=$)` // ou fim da string
      ].join(''),
      'mi'
    )

    const m = md.match(pattern)
    if (m) {
      others.push({
        title: cleanTitle,
        body: m[1].trim(),
        icon: sectionIconMap[cleanTitle] || null
      })
    }
  })

  return {
    system,
    scientific,
    popular,
    contextoGeral,
    impactoBiologico,
    others
  }
}

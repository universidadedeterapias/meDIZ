export default function parseResponse(md: string) {
  // escapa caracteres especiais para uso em RegExp
  function escapeRegex(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
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
  // Ajuste os títulos exatamente como aparecem no MD de entrada:
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
    'Chave Terapêutica do \\[RE\\]Sentir'
  ] as const

  const sectionIconMap: Record<string, string> = {
    'Símbolos Biológicos': 'dna',
    'Conflito Emocional Subjacente': 'triangle-alert',
    'Experiências comuns': 'lightbulb',
    'Padrões de comportamento': 'brain',
    'Impacto Transgeracional': 'workflow',
    Lateralidade: 'arrow-right-left',
    'Fases da doença': 'chart-line',
    'Possíveis doenças correlacionadas': 'link',
    'Perguntas Reflexivas': 'question-mark-circle',
    'Chave Terapêutica do [RE]Sentir': 'heart-pulse'
  }

  const others: OtherItem[] = []

  sectionTitles.forEach((rawTitle, i) => {
    // remove escape dos colchetes para regex
    const cleanTitle = rawTitle.replace(/\\\[|\\\]/g, '')
    const titleEsc = escapeRegex(cleanTitle)
    const lookaheadRaw = sectionTitles[i + 1]?.replace(/\\\[|\\\]/g, '')
    const lookaheadEsc = lookaheadRaw ? escapeRegex(lookaheadRaw) : null

    // Permitir ou não o ":" após o título
    const pattern = new RegExp(
      `\\*\\*${titleEsc}(?::)?\\*\\*\\s*([\\s\\S]*?)` +
        (lookaheadEsc
          ? `(?=\\r?\\n\\*\\*${lookaheadEsc}(?::)?\\*\\*)`
          : `(?=$)`),
      'i'
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

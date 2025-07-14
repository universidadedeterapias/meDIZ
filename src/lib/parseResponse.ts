export default function parseResponse(md: string) {
  // escapa caracteres especiais para uso em RegExp
  function escapeRegex(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  type OtherItem = { title: string; body: string; icon: string | null }

  // ——— CAMPOS ESPECÍFICOS ———
  const scientific =
    md.match(/\*\*Nome científico\*\*\s*\r?\n\s*([^\r\n]+)/i)?.[1].trim() || ''
  const popular =
    md.match(/\*\*\Nome Popular\*\*\s*\r?\n\s*([^\r\n]+)/i)?.[1].trim() || ''
  const system =
    md.match(/\*\*\Sistema\*\*\s*\r?\n\s*([^\r\n]+)/i)?.[1].trim() || ''

  // ——— CONTEXTO GERAL e SENTIDO BIOLÓGICO ———
  const contextoGeral =
    md
      .match(/\*\*Contexto Geral\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  const sentidoBiologico =
    md
      .match(/\*\*Sentido Biológico\*\*\s*([\s\S]*?)(?=\r?\n\*\*|$)/i)?.[1]
      .trim() || ''

  // ——— DEMAIS SEÇÕES ———
  const sectionTitles = [
    'SÍMBOLOS BIOLÓGICOS',
    'CONFLITO EMOCIONAL SUBJACENTE',
    'EXPERIÊNCIAS COMUNS',
    'PADRÕES DE COMPORTAMENTO',
    'LATERALIDADE',
    'FASES DA DOENÇA',
    'IMPACTO TRANSGERACIONAL',
    'CORRELAÇÃO COM OUTRAS DOENÇAS',
    'PERGUNTAS REFLEXIVAS',
    'CHAVE TERAPÊUTICA \\[RE\\]SENTIR',
    'NOTA LEGAL'
  ] as const

  const sectionIconMap: Record<string, string> = {
    'CONFLITO EMOCIONAL SUBJACENTE': 'triangle-alert',
    'SÍMBOLOS BIOLÓGICOS': 'dna',
    'EXPERIÊNCIAS COMUNS': 'lightbulb',
    'PADRÕES DE COMPORTAMENTO': 'brain',
    LATERALIDADE: 'arrow-right-left',
    'FASES DA DOENÇA': 'chart-line',
    'IMPACTO TRANSGERACIONAL': 'workflow',
    'CORRELAÇÃO COM OUTRAS DOENÇAS': 'link',
    'PERGUNTAS REFLEXIVAS': 'question-mark-circle',
    'CHAVE TERAPÊUTICA [RE]SENTIR': 'heart-pulse',
    'NOTA LEGAL': 'document'
  }

  const others: OtherItem[] = []
  sectionTitles.forEach((rawTitle, i) => {
    // remove escapes da chave terapêutica
    const cleanRaw = rawTitle.replace(/\\\[|\\\]/g, '')
    const titleEsc = escapeRegex(cleanRaw)
    const nextRaw = sectionTitles[i + 1]?.replace(/\\\[|\\\]/g, '')
    const lookahead = nextRaw
      ? `(?=\\*\\*${escapeRegex(nextRaw)}\\*\\*)`
      : `(?=$)`
    const pattern = new RegExp(
      `\\*\\*${titleEsc}\\*\\*\\s*([\\s\\S]*?)${lookahead}`,
      'i'
    )
    const m = md.match(pattern)
    if (m) {
      others.push({
        title: cleanRaw,
        body: m[1].trim(),
        icon: sectionIconMap[cleanRaw] || null
      })
    }
  })

  return {
    scientific,
    popular,
    system,
    contextoGeral,
    sentidoBiologico,
    others
  }
}

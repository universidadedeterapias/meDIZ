export default function parseResponse(md: string) {
  // escapa caracteres especiais para uso em RegExp
  function escapeRegex(str: string) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  type OtherItem = { title: string; body: string; icon: string | null }

  // cabeçalhos que você quer no others
  const sectionTitles = [
    'SÍMBOLOS BIOLÓGICOS',
    'CONFLITO EMOCIONAL SUBJACENTE',
    'EXPERIÊNCIAS COMUNS',
    'PADRÕES DE COMPORTAMENTO',
    'IMPACTO TRANSGERACIONAL',
    'LATERALIDADE',
    'FASES DA DOENÇA',
    'DOENÇAS CORRELACIONADAS',
    'CHAVE TERAPÊUTICA [RE]SENTIR',
    'FONTE',
    'PERGUNTAS REFLEXIVAS'
  ] as const

  const sectionIconMap: Record<(typeof sectionTitles)[number], string> = {
    'SÍMBOLOS BIOLÓGICOS': 'dna',
    'CONFLITO EMOCIONAL SUBJACENTE': 'triangle-alert',
    'EXPERIÊNCIAS COMUNS': 'lightbulb',
    'PADRÕES DE COMPORTAMENTO': 'brain',
    'IMPACTO TRANSGERACIONAL': 'workflow',
    LATERALIDADE: 'arrow-right-left',
    'FASES DA DOENÇA': 'chart-line',
    'DOENÇAS CORRELACIONADAS': '', // ou null / ícone padrão
    'CHAVE TERAPÊUTICA [RE]SENTIR': '',
    FONTE: '',
    'PERGUNTAS REFLEXIVAS': 'question-mark-circle'
  }

  const defaultIcon: string | null = null

  // ——— FIXOS ———

  // captura "Nome técnico da condição" ou "Nome Técnico"
  const scientific =
    md
      .match(
        /\*\*(?:Nome técnico da condição|Nome Técnico):\*\*\s*([^\n]+)/i
      )?.[1]
      .trim() || ''

  // captura "Nome Popular"
  const popular =
    md.match(/\*\*Nome Popular:\*\*\s*([^\n]+)/i)?.[1].trim() || ''

  // captura "Sistema X" em negrito, sem colon
  const system = md.match(/\*\*Sistema\s*([^\*]+)\*\*/i)?.[1].trim() || ''

  // captura Contexto Geral, até o próximo ** ou fim
  const contexto =
    md.match(/\*\*Contexto Geral:\*\*\s*([\s\S]*?)(?=\*\*|$)/i)?.[1].trim() ||
    ''

  // captura Sentido Biológico, até o próximo ** ou fim
  const sentido =
    md
      .match(/\*\*Sentido Biológico:\*\*\s*([\s\S]*?)(?=\*\*|$)/i)?.[1]
      .trim() || ''

  // ——— OUTROS ———
  const others: OtherItem[] = []

  sectionTitles.forEach((title, i) => {
    const next = sectionTitles[i + 1]
    const pattern = next
      ? new RegExp(
          `\\*\\*${escapeRegex(
            title
          )}:?\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*${escapeRegex(next)}:?\\*\\*)`,
          'i'
        )
      : new RegExp(`\\*\\*${escapeRegex(title)}:?\\*\\*\\s*([\\s\\S]*?)$`, 'i')

    const m = md.match(pattern)
    if (m) {
      others.push({
        title,
        body: m[1].trim(),
        icon: sectionIconMap[title] ?? defaultIcon
      })
    }
  })

  return { scientific, popular, system, contexto, sentido, others }
}

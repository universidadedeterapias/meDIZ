function escapeRegex(str: string) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

type OtherItem = {
  title: string
  body: string
  icon: string | null
}

export default function parseResponse(md: string) {
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
    'FONTE'
  ] as const

  // mapa de ícones por título (use uppercase exato, sem acentos ou com acentos conforme seu sectionTitles)
  const sectionIconMap: Record<(typeof sectionTitles)[number], string> = {
    'SÍMBOLOS BIOLÓGICOS': 'dna',
    'CONFLITO EMOCIONAL SUBJACENTE': 'triangle-alert',
    'EXPERIÊNCIAS COMUNS': 'lightbulb',
    'PADRÕES DE COMPORTAMENTO': 'brain',
    'IMPACTO TRANSGERACIONAL': 'workflow',
    LATERALIDADE: 'arrow-right-left',
    'FASES DA DOENÇA': 'chart-line',
    // estes não foram mapeados, podem ficar null ou ícone padrão
    'DOENÇAS CORRELACIONADAS': '',
    'CHAVE TERAPÊUTICA [RE]SENTIR': 'null as any',
    FONTE: 'null as any'
  }

  const defaultIcon: string | null = null // ou 'default-icon'

  // campos fixos
  const scientific =
    md.match(/NOME CIENTÍFICO:\s*\*{2}(.+?)\*{2}/i)?.[1].trim() || ''
  const popular = md.match(/NOME POPULAR\s*_([^_]+)_/i)?.[1].trim() || ''
  const system = md.match(/SISTEMA\s*\n([^\n]+)/i)?.[1].trim() || ''
  const contexto =
    md.match(/\*\*CONTEXTO GERAL:\*\*\s*([\s\S]*?)(?=\*\*|$)/i)?.[1].trim() ||
    ''
  const sentido =
    md
      .match(/\*\*SENTIDO BIOLÓGICO:\*\*\s*([\s\S]*?)(?=\*\*|$)/i)?.[1]
      .trim() || ''

  // agora extrai só os outros, com ícone
  const others: OtherItem[] = []

  sectionTitles.forEach((title, i) => {
    const next = sectionTitles[i + 1]
    const pattern = next
      ? new RegExp(
          `\\*\\*${escapeRegex(
            title
          )}\\*\\*:?\\s*([\\s\\S]*?)(?=\\*\\*${escapeRegex(next)}\\*\\*)`,
          'i'
        )
      : new RegExp(`\\*\\*${escapeRegex(title)}\\*\\*:?\\s*([\\s\\S]*?)$`, 'i')

    const m = md.match(pattern)
    if (m) {
      const body = m[1].trim()
      const icon = sectionIconMap[title] ?? defaultIcon
      others.push({ title, body, icon })
    }
  })

  return { scientific, popular, system, contexto, sentido, others }
}

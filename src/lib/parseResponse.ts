function escapeRegex(str: string) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
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

  // campos fixos (continua igual)
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

  // agora extrai só os outros, na ordem
  const others: { title: string; body: string }[] = []
  sectionTitles.forEach((title, i) => {
    const next = sectionTitles[i + 1]
    // regex cru: **TÍTULO**:? tudo até **PRÓXIMO** ou até o fim
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
      others.push({ title, body: m[1].trim() })
    }
  })

  return { scientific, popular, system, contexto, sentido, others }
}

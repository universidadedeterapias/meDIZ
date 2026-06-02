import { LanguageCode } from '@/i18n/config'

/**
 * Dicionário de tradução de sintomas comuns
 * Mapeia termos em português para outros idiomas
 */
const SYMPTOM_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  // Sintomas físicos e emocionais
  'ansiedade': {
    'pt-BR': 'ansiedade',
    'pt-PT': 'ansiedade',
    en: 'anxiety',
    es: 'ansiedad'
  },
  'pressão alta': {
    'pt-BR': 'pressão alta',
    'pt-PT': 'tensão arterial alta',
    en: 'high blood pressure',
    es: 'presión arterial alta'
  },
  'hipertensão': {
    'pt-BR': 'hipertensão',
    'pt-PT': 'hipertensão',
    en: 'hypertension',
    es: 'hipertensión'
  },
  'dor nas costas': {
    'pt-BR': 'dor nas costas',
    'pt-PT': 'dor nas costas',
    en: 'back pain',
    es: 'dolor de espalda'
  },
  'dor de cabeça': {
    'pt-BR': 'dor de cabeça',
    'pt-PT': 'dor de cabeça',
    en: 'headache',
    es: 'dolor de cabeza'
  },
  'cansaço': {
    'pt-BR': 'cansaço',
    'pt-PT': 'cansaço',
    en: 'fatigue',
    es: 'cansancio'
  },
  'fadiga': {
    'pt-BR': 'fadiga',
    'pt-PT': 'fadiga',
    en: 'fatigue',
    es: 'fatiga'
  },
  'estresse': {
    'pt-BR': 'estresse',
    'pt-PT': 'stress',
    en: 'stress',
    es: 'estrés'
  },
  'insônia': {
    'pt-BR': 'insônia',
    'pt-PT': 'insónia',
    en: 'insomnia',
    es: 'insomnio'
  },
  'enxaqueca': {
    'pt-BR': 'enxaqueca',
    'pt-PT': 'enxaqueca',
    en: 'migraine',
    es: 'migraña'
  },
  'rinite': {
    'pt-BR': 'rinite',
    'pt-PT': 'rinite',
    en: 'rhinitis',
    es: 'rinitis'
  },
  'dor no joelho': {
    'pt-BR': 'dor no joelho',
    'pt-PT': 'dor no joelho',
    en: 'knee pain',
    es: 'dolor de rodilla'
  },
  'depressão': {
    'pt-BR': 'depressão',
    'pt-PT': 'depressão',
    en: 'depression',
    es: 'depresión'
  },
  'pânico': {
    'pt-BR': 'pânico',
    'pt-PT': 'pânico',
    en: 'panic',
    es: 'pánico'
  },
  'medo': {
    'pt-BR': 'medo',
    'pt-PT': 'medo',
    en: 'fear',
    es: 'miedo'
  },
  'tristeza': {
    'pt-BR': 'tristeza',
    'pt-PT': 'tristeza',
    en: 'sadness',
    es: 'tristeza'
  },
  'raiva': {
    'pt-BR': 'raiva',
    'pt-PT': 'raiva',
    en: 'anger',
    es: 'ira'
  },
  // Adicionando mais traduções comuns
  'dor': {
    'pt-BR': 'dor',
    'pt-PT': 'dor',
    en: 'pain',
    es: 'dolor'
  },
  'cabeça': {
    'pt-BR': 'cabeça',
    'pt-PT': 'cabeça',
    en: 'head',
    es: 'cabeza'
  },
  'costas': {
    'pt-BR': 'costas',
    'pt-PT': 'costas',
    en: 'back',
    es: 'espalda'
  },
  'joelho': {
    'pt-BR': 'joelho',
    'pt-PT': 'joelho',
    en: 'knee',
    es: 'rodilla'
  },
  'peito': {
    'pt-BR': 'peito',
    'pt-PT': 'peito',
    en: 'chest',
    es: 'pecho'
  },
  'barriga': {
    'pt-BR': 'barriga',
    'pt-PT': 'barriga',
    en: 'belly',
    es: 'barriga'
  },
  'garganta': {
    'pt-BR': 'garganta',
    'pt-PT': 'garganta',
    en: 'throat',
    es: 'garganta'
  },
  'febre': {
    'pt-BR': 'febre',
    'pt-PT': 'febre',
    en: 'fever',
    es: 'fiebre'
  },
  'tosse': {
    'pt-BR': 'tosse',
    'pt-PT': 'tosse',
    en: 'cough',
    es: 'tos'
  },
  'nausea': {
    'pt-BR': 'nausea',
    'pt-PT': 'náusea',
    en: 'nausea',
    es: 'náusea'
  },
  'tontura': {
    'pt-BR': 'tontura',
    'pt-PT': 'tontura',
    en: 'dizziness',
    es: 'mareo'
  },
  // Sintomas adicionais comuns
  'fibromialgia': {
    'pt-BR': 'fibromialgia',
    'pt-PT': 'fibromialgia',
    en: 'fibromyalgia',
    es: 'fibromialgia'
  },
  'gripe': {
    'pt-BR': 'gripe',
    'pt-PT': 'gripe',
    en: 'flu',
    es: 'gripe'
  },
  'aftas': {
    'pt-BR': 'aftas',
    'pt-PT': 'aftas',
    en: 'canker sores',
    es: 'aftas'
  },
  'tornozelo': {
    'pt-BR': 'tornozelo',
    'pt-PT': 'tornozelo',
    en: 'ankle',
    es: 'tobillo'
  },
  'coceira nas axilas': {
    'pt-BR': 'coceira nas axilas',
    'pt-PT': 'comichão nas axilas',
    en: 'itchy armpits',
    es: 'picazón en las axilas'
  },
  'infarto': {
    'pt-BR': 'infarto',
    'pt-PT': 'enfarte',
    en: 'heart attack',
    es: 'infarto'
  },
  'pressão baixa': {
    'pt-BR': 'pressão baixa',
    'pt-PT': 'tensão arterial baixa',
    en: 'low blood pressure',
    es: 'presión arterial baja'
  },
  'dor nas pernas': {
    'pt-BR': 'dor nas pernas',
    'pt-PT': 'dor nas pernas',
    en: 'leg pain',
    es: 'dolor en las piernas'
  },
  'erisipela': {
    'pt-BR': 'erisipela',
    'pt-PT': 'erisipela',
    en: 'erysipelas',
    es: 'erisipela'
  },
  'linfoma de hodgkin': {
    'pt-BR': 'linfoma de hodgkin',
    'pt-PT': 'linfoma de hodgkin',
    en: 'hodgkin lymphoma',
    es: 'linfoma de hodgkin'
  },
  'anxiety': {
    'pt-BR': 'ansiedade',
    'pt-PT': 'ansiedade',
    en: 'anxiety',
    es: 'ansiedad'
  },
  'back pain': {
    'pt-BR': 'dor nas costas',
    'pt-PT': 'dor nas costas',
    en: 'back pain',
    es: 'dolor de espalda'
  },
  'high blood pressure': {
    'pt-BR': 'pressão alta',
    'pt-PT': 'tensão arterial alta',
    en: 'high blood pressure',
    es: 'presión arterial alta'
  },
  'migraine': {
    'pt-BR': 'enxaqueca',
    'pt-PT': 'enxaqueca',
    en: 'migraine',
    es: 'migraña'
  },
  'fibromyalgia': {
    'pt-BR': 'fibromialgia',
    'pt-PT': 'fibromialgia',
    en: 'fibromyalgia',
    es: 'fibromialgia'
  },
  'insomnia': {
    'pt-BR': 'insônia',
    'pt-PT': 'insónia',
    en: 'insomnia',
    es: 'insomnio'
  },
  'flu': {
    'pt-BR': 'gripe',
    'pt-PT': 'gripe',
    en: 'flu',
    es: 'gripe'
  },
  'headache': {
    'pt-BR': 'dor de cabeça',
    'pt-PT': 'dor de cabeça',
    en: 'headache',
    es: 'dolor de cabeza'
  },
  'knee pain': {
    'pt-BR': 'dor no joelho',
    'pt-PT': 'dor no joelho',
    en: 'knee pain',
    es: 'dolor de rodilla'
  },
  'fatigue': {
    'pt-BR': 'cansaço',
    'pt-PT': 'cansaço',
    en: 'fatigue',
    es: 'cansancio'
  },
  'hodgkin lymphoma': {
    'pt-BR': 'linfoma de hodgkin',
    'pt-PT': 'linfoma de hodgkin',
    en: 'hodgkin lymphoma',
    es: 'linfoma de hodgkin'
  },
  'canker sores': {
    'pt-BR': 'aftas',
    'pt-PT': 'aftas',
    en: 'canker sores',
    es: 'aftas'
  },
  'ankle': {
    'pt-BR': 'tornozelo',
    'pt-PT': 'tornozelo',
    en: 'ankle',
    es: 'tobillo'
  },
  'itchy armpits': {
    'pt-BR': 'coceira nas axilas',
    'pt-PT': 'comichão nas axilas',
    en: 'itchy armpits',
    es: 'picazón en las axilas'
  },
  'pain': {
    'pt-BR': 'dor',
    'pt-PT': 'dor',
    en: 'pain',
    es: 'dolor'
  },
  'heart attack': {
    'pt-BR': 'infarto',
    'pt-PT': 'enfarte',
    en: 'heart attack',
    es: 'infarto'
  },
  'low blood pressure': {
    'pt-BR': 'pressão baixa',
    'pt-PT': 'tensão arterial baixa',
    en: 'low blood pressure',
    es: 'presión arterial baja'
  },
  'leg pain': {
    'pt-BR': 'dor nas pernas',
    'pt-PT': 'dor nas pernas',
    en: 'leg pain',
    es: 'dolor en las piernas'
  },
  'erysipelas': {
    'pt-BR': 'erisipela',
    'pt-PT': 'erisipela',
    en: 'erysipelas',
    es: 'erisipela'
  }
}

/**
 * Traduz um sintoma de outro idioma para português (tradução reversa)
 * Busca no dicionário por valor ao invés de chave
 */
function translateToPortuguese(symptom: string): string {
  if (!symptom || !symptom.trim()) {
    return symptom
  }

  const normalized = symptom.toLowerCase().trim()
  let translated = symptom
  
  // Ordena por tamanho (maior primeiro) para priorizar sintomas compostos
  const sortedEntries = Object.entries(SYMPTOM_TRANSLATIONS).sort((a, b) => {
    const aEn = a[1].en?.toLowerCase() || ''
    const aEs = a[1].es?.toLowerCase() || ''
    const bEn = b[1].en?.toLowerCase() || ''
    const bEs = b[1].es?.toLowerCase() || ''
    const aMax = Math.max(aEn.length, aEs.length)
    const bMax = Math.max(bEn.length, bEs.length)
    return bMax - aMax
  })
  
  // Busca reversa: procura o sintoma como valor nas traduções
  for (const [ptKey, translations] of sortedEntries) {
    const ptBR = translations['pt-BR'] || ptKey
    const en = translations.en?.toLowerCase() || ''
    const es = translations.es?.toLowerCase() || ''
    
    // Match exato em inglês
    if (en && normalized === en) {
      return ptBR
    }
    
    // Match exato em espanhol
    if (es && normalized === es) {
      return ptBR
    }
    
    // Match parcial (para sintomas compostos) - apenas se o termo tem mais de 4 caracteres
    if (en && en.length > 4 && normalized.includes(en)) {
      const regex = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      translated = translated.replace(regex, ptBR)
      continue
    }
    
    if (es && es.length > 4 && normalized.includes(es)) {
      const regex = new RegExp(`\\b${es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      translated = translated.replace(regex, ptBR)
      continue
    }
  }
  
  // Se houve alguma substituição, retorna traduzido, senão retorna original
  return translated !== symptom ? translated : symptom
}

/**
 * Traduz um sintoma/pergunta para o idioma especificado
 * Se não encontrar tradução exata, retorna a mensagem original
 * 
 * Estratégia:
 * 1. Tenta tradução exata
 * 2. Tenta tradução parcial (substitui termos conhecidos)
 * 3. Se não encontrar, retorna original (webhook pode detectar idioma)
 */
export function translateSymptom(
  symptom: string,
  targetLanguage: LanguageCode
): string {
  if (!symptom || !symptom.trim()) {
    return symptom
  }

  // Se o idioma alvo é português, tenta traduzir de volta se estiver em outro idioma
  if (targetLanguage === 'pt-BR' || targetLanguage === 'pt-PT') {
    // Detecta se o sintoma está em outro idioma
    const hasPortugueseChars = /[áàâãéêíóôõúç]/i.test(symptom)
    const hasSpanishChars = /[ñáéíóúü]/i.test(symptom)
    const hasOnlyEnglish = /^[a-z0-9\s.,!?;:'"()-]+$/i.test(symptom) && !hasPortugueseChars && !hasSpanishChars
    
    // Se parece estar em inglês ou espanhol, tenta traduzir para português
    if (hasOnlyEnglish || (hasSpanishChars && !hasPortugueseChars)) {
      const translated = translateToPortuguese(symptom)
      if (translated !== symptom) {
        return translated
      }
    }
    
    // Se já está em português, retorna como está
    return symptom
  }

  const normalized = symptom.toLowerCase().trim()
  let translated = symptom

  // 1. Tenta encontrar tradução exata
  const exactTranslation = SYMPTOM_TRANSLATIONS[normalized]
  if (exactTranslation) {
    const translation = exactTranslation[targetLanguage]
    if (translation) {
      return translation
    }
  }

  // 2. Tenta encontrar e substituir termos conhecidos na mensagem
  // Ordena por tamanho (maior primeiro) para evitar substituições parciais incorretas
  const sortedKeys = Object.keys(SYMPTOM_TRANSLATIONS).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    const translations = SYMPTOM_TRANSLATIONS[key]
    if (translations) {
      const targetTranslation = translations[targetLanguage]
      
      if (targetTranslation) {
        // Cria regex case-insensitive para encontrar o termo
        const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
        if (regex.test(translated)) {
          translated = translated.replace(regex, targetTranslation)
        }
      }
    }
  }

  // 3. Se não encontrou tradução, retorna a mensagem original
  // O webhook detectará o idioma da pergunta e responderá no mesmo idioma
  return translated
}

/**
 * Determina se uma mensagem precisa ser traduzida
 * (se o idioma alvo é diferente do idioma detectado na mensagem)
 */
export function shouldTranslateMessage(
  message: string,
  targetLanguage: LanguageCode
): boolean {
  if (!message || !message.trim()) {
    return false
  }

  // Se o idioma alvo é português, não precisa traduzir
  if (targetLanguage === 'pt-BR' || targetLanguage === 'pt-PT') {
    return false
  }

  // Detecta idioma da mensagem baseado em caracteres e padrões
  const hasPortugueseChars = /[áàâãéêíóôõúç]/i.test(message)
  const hasSpanishChars = /[ñáéíóúü]/i.test(message)
  const hasOnlyEnglish = /^[a-z0-9\s.,!?;:'"()-]+$/i.test(message)
  
  // Lista expandida de palavras portuguesas comuns (incluindo artigos, preposições, etc.)
  const portugueseWords = [
    // Sintomas e condições
    'ansiedade', 'depressao', 'depressão', 'panico', 'pânico', 'medo', 'tristeza', 'raiva',
    'dor', 'cansaço', 'cansaco', 'fadiga', 'estresse', 'insonia', 'insônia', 'enxaqueca',
    'rinite', 'pressao', 'pressão', 'hipertensao', 'hipertensão', 'cabeça', 'cabeca',
    'costas', 'joelho', 'sintoma', 'sintomas', 'doenca', 'doença', 'condição', 'condicao',
    // Artigos e preposições comuns
    'nas', 'no', 'na', 'da', 'de', 'do', 'dos', 'das', 'com', 'para', 'por', 'que', 'qual',
    'como', 'quando', 'onde', 'porque', 'por que', 'qualquer', 'algum', 'alguma',
    // Verbos comuns
    'tenho', 'sinto', 'sentindo', 'estou', 'está', 'estao', 'estão', 'faz', 'fazer',
    // Outras palavras comuns
    'meu', 'minha', 'meus', 'minhas', 'esse', 'essa', 'isso', 'aquilo', 'aqui', 'ali'
  ]
  const normalizedMessage = message.toLowerCase().trim()
  const hasPortugueseWords = portugueseWords.some(word => 
    normalizedMessage.includes(word.toLowerCase())
  )

  // Se o idioma alvo é inglês e a mensagem claramente já está em inglês (sem nenhum indicador de português)
  if (targetLanguage === 'en' && hasOnlyEnglish && !hasPortugueseChars && !hasSpanishChars && !hasPortugueseWords) {
    return false // Já está em inglês
  }

  // Se o idioma alvo é espanhol e a mensagem claramente já está em espanhol (sem indicadores de português)
  if (targetLanguage === 'es' && hasSpanishChars && !hasPortugueseChars && !hasPortugueseWords) {
    return false // Já está em espanhol
  }

  // Se detectou português (caracteres OU palavras conhecidas), sempre traduz se o alvo não é português
  // TypeScript já sabe que targetLanguage não é pt-BR ou pt-PT após a verificação acima
  if (hasPortugueseChars || hasPortugueseWords) {
    return true
  }

  // ESTRATÉGIA MAIS AGRESSIVA: Se o idioma alvo não é português e a mensagem não está claramente em outro idioma,
  // assume que é português e tenta traduzir
  // Isso garante que mensagens em português sem acentos ou palavras conhecidas ainda sejam traduzidas
  // TypeScript já sabe que targetLanguage não é pt-BR ou pt-PT após a verificação acima
  // Se não tem indicadores claros de inglês ou espanhol, assume português
  if (!hasOnlyEnglish && !hasSpanishChars) {
    return true
  }

  return false
}



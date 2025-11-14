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
  }
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

  // Se o idioma alvo é português, não precisa traduzir
  if (targetLanguage === 'pt-BR' || targetLanguage === 'pt-PT') {
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



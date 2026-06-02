import { LanguageCode, DEFAULT_LANGUAGE } from '@/i18n/config'
import { translateSymptom } from './translateSymptom'

/**
 * Palavras que devem permanecer em minúsculas (exceto no início)
 * Artigos, preposições, conjunções comuns
 */
const LOWERCASE_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
  'a', 'o', 'as', 'os', 'e', 'ou', 'com', 'sem', 'por', 'para',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'o', 'con', 'sin', 'por', 'para'
])

/**
 * Palavras que devem sempre começar com maiúscula
 */
const ALWAYS_CAPITALIZE = new Set([
  'i', 'eu', 'yo', // Pronomes pessoais
])

/**
 * Corrige acentuação comum em português
 */
function fixAccents(text: string): string {
  const fixes: Record<string, string> = {
    'cansaco': 'cansaço',
    'insonia': 'insônia',
    'pressao': 'pressão',
    'depressao': 'depressão',
    'nausea': 'náusea',
    'hipertensao': 'hipertensão',
    'cabeca': 'cabeça',
    'fibromialgia': 'fibromialgia',
    'gripe': 'gripe',
    'aftas': 'aftas',
    'tornozelo': 'tornozelo',
    'infarto': 'infarto',
    'erisipela': 'erisipela',
    'linfoma': 'linfoma',
    'hodgkin': 'hodgkin',
    'coceira': 'coceira',
    'axilas': 'axilas',
    'pernas': 'pernas',
    'costas': 'costas',
    'enxaqueca': 'enxaqueca',
    'ansiedade': 'ansiedade',
    'dor': 'dor',
    'nas': 'nas',
    'no': 'no',
    'de': 'de',
    'cabeça': 'cabeça',
    'joelho': 'joelho',
    'pressao alta': 'pressão alta',
    'pressao baixa': 'pressão baixa',
    'dor nas costas': 'dor nas costas',
    'dor de cabeça': 'dor de cabeça',
    'dor no joelho': 'dor no joelho',
    'dor nas pernas': 'dor nas pernas',
    'coceira nas axilas': 'coceira nas axilas',
    'linfoma de hodgkin': 'linfoma de hodgkin'
  }
  
  const lower = text.toLowerCase().trim()
  
  // Primeiro tenta match exato
  if (fixes[lower]) {
    // Preserva a capitalização original
    if (text[0] === text[0].toUpperCase()) {
      return fixes[lower].charAt(0).toUpperCase() + fixes[lower].slice(1)
    }
    return fixes[lower]
  }
  
  // Tenta substituir palavras individuais (para sintomas compostos)
  let fixed = text
  for (const [wrong, correct] of Object.entries(fixes)) {
    if (wrong.length > 3) { // Apenas palavras com mais de 3 caracteres
      const regex = new RegExp(`\\b${wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      fixed = fixed.replace(regex, (match) => {
        // Preserva capitalização
        if (match[0] === match[0].toUpperCase()) {
          return correct.charAt(0).toUpperCase() + correct.slice(1)
        }
        return correct
      })
    }
  }
  
  return fixed
}

/**
 * Formata sintoma com correção ortográfica e capitalização title case
 * Respeita o idioma do usuário
 */
export function formatSymptom(
  symptom: string,
  userLanguage: LanguageCode = DEFAULT_LANGUAGE
): string {
  if (!symptom || !symptom.trim()) {
    return symptom
  }

  // Remove espaços extras e normaliza
  let formatted = symptom.trim().replace(/\s+/g, ' ')

  // Corrige acentuação comum (antes da tradução para melhor matching)
  formatted = fixAccents(formatted)

  // Traduz para o idioma do usuário (a função translateSymptom já trata tradução reversa)
  formatted = translateSymptom(formatted, userLanguage)

  // Aplica title case (primeira letra maiúscula, resto minúscula, exceto palavras especiais)
  const words = formatted.split(' ')
  const titleCased = words.map((word, index) => {
    if (!word) return word
    
    const lower = word.toLowerCase()
    
    // Primeira palavra sempre capitaliza
    if (index === 0) {
      // Se é palavra que sempre deve ser maiúscula
      if (ALWAYS_CAPITALIZE.has(lower)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    }
    
    // Palavras que devem ficar minúsculas (artigos, preposições)
    if (LOWERCASE_WORDS.has(lower)) {
      return lower
    }
    
    // Demais palavras: primeira letra maiúscula
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  })

  return titleCased.join(' ')
}

/**
 * Formata múltiplos sintomas
 */
export function formatSymptoms(
  symptoms: string[],
  userLanguage: LanguageCode = DEFAULT_LANGUAGE
): string[] {
  return symptoms.map(s => formatSymptom(s, userLanguage))
}


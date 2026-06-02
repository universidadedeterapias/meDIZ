import type { LanguageCode } from '@/i18n/config'

/**
 * Mapeamento de idiomas para links de upgrade do meDIZ
 * Cada idioma tem um link específico para a página de upgrade
 */
const UPGRADE_LINKS: Record<LanguageCode, string> = {
  'pt-BR': 'https://universidadedeterapias.com.br/mediz-upgrade-brasil',
  'pt-PT': 'https://universidadedeterapias.com.br/mediz-upgrade-portugal',
  en: 'https://universidadedeterapias.com.br/mediz-upgrade-english',
  es: 'https://universidadedeterapias.com.br/mediz-upgrade-spanish'
}

/**
 * Retorna o link de upgrade baseado no idioma atual
 * @param language - Código do idioma (pt-BR, pt-PT, en, es)
 * @returns URL da página de upgrade do meDIZ
 */
export function getUpgradeLink(language: LanguageCode): string {
  return UPGRADE_LINKS[language] || UPGRADE_LINKS['pt-BR']
}


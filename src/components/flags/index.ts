import type { ComponentType } from 'react'
import { BrazilFlag } from './BrazilFlag'
import { PortugalFlag } from './PortugalFlag'
import { UKFlag } from './UKFlag'
import { SpainFlag } from './SpainFlag'
import type { LanguageCode } from '@/i18n/config'

export const FLAG_COMPONENTS: Record<LanguageCode, ComponentType<{ className?: string }>> = {
  'pt-BR': BrazilFlag,
  'pt-PT': PortugalFlag,
  en: UKFlag,
  es: SpainFlag
}

export { BrazilFlag, PortugalFlag, UKFlag, SpainFlag }

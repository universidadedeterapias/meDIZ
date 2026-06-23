'use client'

import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

interface SymptomOption {
  sintoma: string
  quantidade: number
}

interface DynamicOptionSelectorProps {
  options: SymptomOption[]
  value: string
  onChange: (value: string) => void
}

/**
 * Mapeia sintomas em português para chaves de tradução
 */
function getSymptomTranslationKey(sintoma: string): string | null {
  const sintomaLower = sintoma.toLowerCase().trim()
  
  const symptomMap: Record<string, string> = {
    'dor nas costas': 'symptoms.backPain',
    'pressão alta': 'symptoms.highBloodPressure',
    'cansaço': 'symptoms.fatigue',
    'enxaqueca': 'symptoms.migraine',
    'insônia': 'symptoms.insomnia',
    'ansiedade': 'symptoms.anxiety',
    'rinite': 'symptoms.rhinitis',
    'dor no joelho': 'symptoms.kneePain',
    'estresse': 'symptoms.stress',
    'dor de cabeça': 'symptoms.headache'
  }
  
  return symptomMap[sintomaLower] || null
}

/**
 * Traduz um sintoma do português para o idioma atual
 */
function translateSymptom(sintoma: string, t: (key: string, fallback?: string) => string): string {
  const translationKey = getSymptomTranslationKey(sintoma)
  if (translationKey) {
    return t(translationKey, sintoma)
  }
  return sintoma
}

export default function DynamicOptionSelector({
  options,
  value,
  onChange
}: DynamicOptionSelectorProps) {
  const { t } = useTranslation()

  const validOptions = options.filter(opt => opt.quantidade > 0)

  if (validOptions.length === 0) {
    return null
  }

  const maxQuantidade = Math.max(...validOptions.map(opt => opt.quantidade))
  const sintomaMaisPopular = validOptions.find(opt => opt.quantidade === maxQuantidade)

  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      {options.map(option => {
        const translatedSymptom = translateSymptom(option.sintoma, t)
        // Compara tanto o sintoma original quanto o traduzido para detectar seleção
        const isSelected = option.sintoma === value || translatedSymptom === value
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma && option.quantidade > 0

        return (
          <Button
            key={option.sintoma}
            type="button"
            variant="outline"
            onClick={() => onChange(translatedSymptom)}
            className={
              isSelected
                ? 'relative overflow-visible rounded-full border-indigo-600 bg-indigo-600 px-4 py-2 text-base font-normal text-white'
                : 'relative overflow-visible rounded-full border-border bg-card px-4 py-2 text-base font-normal text-foreground hover:bg-accent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
            }
          >
            {translatedSymptom}
            {isMostPopular && (
              <ArrowUp
                className="absolute -right-1.5 -top-1.5 z-10 h-4 w-4 rounded-full border border-green-200 bg-background p-0.5 text-green-600 shadow-sm dark:border-green-800 dark:bg-zinc-900"
                strokeWidth={2.5}
                aria-label={t('dynamicSelector.mostSearched', 'Mais pesquisado')}
              />
            )}
          </Button>
        )
      })}
    </div>
  )
}


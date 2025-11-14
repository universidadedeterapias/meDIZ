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
        const isSelected = option.sintoma === value
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma && option.quantidade > 0
        const translatedSymptom = translateSymptom(option.sintoma, t)

        return (
          <Button
            key={option.sintoma}
            type="button"
            variant="outline"
            onClick={() => onChange(option.sintoma)}
            className={`
              rounded-full px-4 py-2 text-base font-normal relative
              overflow-visible
              ${
                isSelected
                  ? 'bg-indigo-600 text-zinc-50 border-indigo-600'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-300'
              }
            `}
          >
            {translatedSymptom}
            {isMostPopular && (
              <ArrowUp
                className="absolute -top-1.5 -right-1.5 w-4 h-4 text-green-600 bg-white rounded-full p-0.5 shadow-sm border border-green-200 z-10"
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


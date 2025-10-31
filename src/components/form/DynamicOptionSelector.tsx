'use client'

import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'

interface SymptomOption {
  sintoma: string
  quantidade: number
}

interface DynamicOptionSelectorProps {
  options: SymptomOption[]
  value: string
  onChange: (value: string) => void
}

export default function DynamicOptionSelector({
  options,
  value,
  onChange
}: DynamicOptionSelectorProps) {
  // Encontra o sintoma mais popular (maior quantidade)
  // Filtra apenas opções com quantidade válida
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
        // Mostra a seta se for o mais popular E tiver quantidade > 0
        // Remove a condição > 1 para permitir mostrar mesmo quando todos têm quantidade 1
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma && option.quantidade > 0

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
            {option.sintoma}
            {isMostPopular && (
              <ArrowUp 
                className="absolute -top-1.5 -right-1.5 w-4 h-4 text-green-600 bg-white rounded-full p-0.5 shadow-sm border border-green-200 z-10" 
                strokeWidth={2.5}
                aria-label="Mais pesquisado"
              />
            )}
          </Button>
        )
      })}
    </div>
  )
}


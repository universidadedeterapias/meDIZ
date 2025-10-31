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
  // Verifica se há opções antes de calcular o máximo
  const maxQuantidade = options.length > 0 
    ? Math.max(...options.map(opt => opt.quantidade))
    : 0
  
  const sintomaMaisPopular = options.find(opt => opt.quantidade === maxQuantidade)

  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      {options.map(option => {
        const isSelected = option.sintoma === value
        // Mostra a seta verde no sintoma mais popular (sem exigir quantidade > 1)
        // Se houver empate, mostra no primeiro encontrado
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma && 
                              maxQuantidade > 0 &&
                              sintomaMaisPopular.quantidade === option.quantidade

        return (
          <Button
            key={option.sintoma}
            type="button"
            variant="outline"
            onClick={() => onChange(option.sintoma)}
            className={`
              rounded-full px-4 py-2 text-base font-normal relative
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
                className="absolute -top-1 -right-1 w-3 h-3 text-green-500 bg-white rounded-full p-0.5 shadow-sm" 
                style={{ fontSize: '8px' }}
              />
            )}
          </Button>
        )
      })}
    </div>
  )
}


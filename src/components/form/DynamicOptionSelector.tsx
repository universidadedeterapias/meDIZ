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
  const maxQuantidade = Math.max(...options.map(opt => opt.quantidade))
  const sintomaMaisPopular = options.find(opt => opt.quantidade === maxQuantidade)

  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      {options.map(option => {
        const isSelected = option.sintoma === value
<<<<<<< HEAD
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma && option.quantidade > 1
=======
        const isMostPopular = option.sintoma === sintomaMaisPopular?.sintoma
>>>>>>> feature/pdf-export-and-growth

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
<<<<<<< HEAD
              <ArrowUp 
                className="absolute -top-1 -right-1 w-3 h-3 text-green-500 bg-white rounded-full p-0.5" 
                style={{ fontSize: '8px' }}
              />
=======
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <ArrowUp 
                  className="w-2.5 h-2.5 text-white" 
                />
              </div>
>>>>>>> feature/pdf-export-and-growth
            )}
          </Button>
        )
      })}
    </div>
  )
}


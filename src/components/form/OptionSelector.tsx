'use client'

import { Button } from '@/components/ui/button'
import { ArrowUp } from 'lucide-react'

interface OptionSelectorProps {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}

export default function OptionSelector({
  options,
  value,
  onChange
}: OptionSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center pt-2">
      {options.map((option, index) => {
        const isSelected = option.value === value
        const isMostPopular = index === 0 // Primeiro sintoma é o mais popular

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            onClick={() => onChange(option.value)}
            className={`
              rounded-full px-4 py-2 text-base font-normal relative
              ${
                isSelected
                  ? 'bg-indigo-600 text-zinc-50 border-indigo-600'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-300'
              }
            `}
          >
            {option.label}
            {isMostPopular && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <ArrowUp 
                  className="w-2.5 h-2.5 text-white" 
                />
              </div>
            )}
          </Button>
        )
      })}
    </div>
  )
}

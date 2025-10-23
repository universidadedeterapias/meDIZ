'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardOption {
  label: string
  value: string
  description: string
  icon: ReactNode
}

interface CardSelectorProps {
  options: CardOption[]
  value: string
  onChange: (value: string) => void
}

export default function CardSelector({
  options,
  value,
  onChange
}: CardSelectorProps) {
  return (
    <div className="w-full flex flex-wrap gap-3">
      {options.map(option => {
        const isSelected = option.value === value

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            onClick={() => onChange(option.value)}
            className={cn(
              `
          flex-1 
          min-w-[140px] 
          max-w-full 
          sm:max-w-[calc(50%-0.5rem)] 
          flex flex-col items-center justify-start 
          rounded-xl border-2 text-center 
          min-h-32 
          p-4
          transition-all
          `,
              isSelected
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-zinc-300 bg-zinc-50'
            )}
          >
            <div className="text-indigo-600 mb-2">{option.icon}</div>
            <div className="font-semibold">{option.label}</div>
            <div className="w-full text-xs text-zinc-500 text-center whitespace-normal break-words px-1 mt-1">
              {option.description}
            </div>
          </Button>
        )
      })}
    </div>
  )
}

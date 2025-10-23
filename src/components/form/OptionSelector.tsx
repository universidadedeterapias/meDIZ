'use client'

import { Button } from '@/components/ui/button'

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
      {options.map(option => {
        const isSelected = option.value === value

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            onClick={() => onChange(option.value)}
            className={`
              rounded-full px-4 py-2 text-base font-normal
              ${
                isSelected
                  ? 'bg-indigo-600 text-zinc-50 border-indigo-600'
                  : 'bg-zinc-50 text-zinc-700 border-zinc-300'
              }
            `}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

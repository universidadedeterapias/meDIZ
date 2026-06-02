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
            className={
              isSelected
                ? 'rounded-full border-indigo-600 bg-indigo-600 px-4 py-2 text-base font-normal text-white'
                : 'rounded-full border-border bg-card px-4 py-2 text-base font-normal text-foreground hover:bg-accent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
            }
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

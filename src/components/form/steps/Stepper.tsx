'use client'

import { useUserForm } from '@/hooks/use-form-data'
import React from 'react'

const TOTAL_STEPS = 4

export default function Stepper() {
  const { step } = useUserForm()

  return (
    <div className="w-full flex items-center justify-center mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const currentStep = index + 1
        const isActive = step === currentStep
        const isCompleted = step > currentStep

        return (
          <React.Fragment key={currentStep}>
            {/* Círculo */}
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full text-base font-bold border-2 border-zinc-300
                ${
                  isCompleted
                    ? 'bg-green-500 text-zinc-50 border-none'
                    : isActive
                    ? 'bg-indigo-600 text-zinc-50 border-none'
                    : 'bg-zinc-50 text-zinc-400'
                }
              `}
            >
              {currentStep}
            </div>

            {/* Linha (exceto no último) */}
            {currentStep < TOTAL_STEPS && (
              <div className="flex-1 w-full h-0.5 bg-zinc-300" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

'use client'

import { useUserForm } from '@/hooks/use-form-data'
import React from 'react'

const TOTAL_STEPS = 4

export default function Stepper() {
  const { step } = useUserForm()

  return (
    <div className="w-full flex items-center justify-center space-x-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
        const currentStep = index + 1
        const isActive = step === currentStep
        const isCompleted = step > currentStep

        return (
          <React.Fragment key={currentStep}>
            {/* Círculo */}
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-300 text-gray-700'
                }
              `}
            >
              {currentStep}
            </div>

            {/* Linha (exceto no último) */}
            {currentStep < TOTAL_STEPS && (
              <div
                className={`flex-1 w-full h-1 
                  ${step > currentStep ? 'bg-green-500' : 'bg-gray-300'}
                `}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

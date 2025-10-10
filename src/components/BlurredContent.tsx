'use client'

import { Button } from '@/components/ui/button'

interface BlurredContentProps {
  children: React.ReactNode
  onSubscribe: () => void
}

export default function BlurredContent({ onSubscribe }: BlurredContentProps) {
  return (
    <div className="relative min-h-[120px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      {/* Overlay completo - sem mostrar conteúdo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="font-semibold text-indigo-600 text-lg">
          Conteúdo Premium
        </p>
        <p className="text-gray-600 text-sm max-w-sm">
          Este conteúdo está disponível apenas para assinantes premium
        </p>
        <Button
          onClick={onSubscribe}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg font-medium"
        >
          Assinar para Desbloquear
        </Button>
      </div>
    </div>
  )
}

// Versão para usar dentro de um accordion
export function BlurredAccordionContent({ onSubscribe }: BlurredContentProps) {
  return (
    <div className="relative min-h-[80px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      {/* Overlay completo - sem mostrar conteúdo */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-1">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="font-semibold text-indigo-600 text-sm">
          Conteúdo Premium
        </p>
        <Button
          onClick={onSubscribe}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-1 text-sm rounded-lg font-medium"
          size="sm"
        >
          Assinar para Desbloquear
        </Button>
      </div>
    </div>
  )
}

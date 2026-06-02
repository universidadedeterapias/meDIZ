'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface BlurredContentAdvancedProps {
  children: React.ReactNode
  onSubscribe: () => void
  blurIntensity?: number // 1-10
  visibleLines?: number
  customMessage?: string
  showPreview?: boolean
}

export default function BlurredContentAdvanced({ 
  children, 
  onSubscribe,
  blurIntensity = 5,
  visibleLines = 1,
  customMessage = "Conteúdo disponível apenas para assinantes",
  showPreview = false
}: BlurredContentAdvancedProps) {
  const [previewMode, setPreviewMode] = useState(false)
  
  // Calcula a altura visível baseada no número de linhas
  // Assumindo que cada linha tem aproximadamente 24px de altura
  const visibleHeight = visibleLines * 24
  
  // Calcula a intensidade do blur (de 2px a 10px)
  const blurPixels = Math.min(Math.max(blurIntensity, 1), 10) * 2
  
  return (
    <div className="relative">
      {/* Conteúdo truncado */}
      <div 
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: previewMode ? '100%' : `${visibleHeight}px` }}
      >
        {children}
      </div>

      {/* Overlay com blur */}
      {!previewMode && (
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-white"
          style={{ 
            backdropFilter: `blur(${blurPixels}px)`,
            WebkitBackdropFilter: `blur(${blurPixels}px)` 
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
            <p className="font-semibold text-indigo-600">
              {customMessage}
            </p>
            <div className="flex gap-2">
              {showPreview && (
                <Button
                  onClick={() => setPreviewMode(true)}
                  variant="outline"
                  className="px-6"
                >
                  Ver Prévia
                </Button>
              )}
              <Button
                onClick={onSubscribe}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
              >
                Assinar para Desbloquear
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão para retornar à visualização truncada quando em modo de prévia */}
      {previewMode && (
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={() => setPreviewMode(false)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            Voltar ao Resumo
          </Button>
        </div>
      )}
    </div>
  )
}

// Versão para usar dentro de um accordion
export function BlurredAccordionContentAdvanced({ 
  children, 
  onSubscribe,
  blurIntensity = 5,
  visibleLines = 1,
  showPreview = false
}: BlurredContentAdvancedProps) {
  const [previewMode, setPreviewMode] = useState(false)
  
  // Calcula a altura visível baseada no número de linhas
  const visibleHeight = visibleLines * 24
  
  // Calcula a intensidade do blur (de 2px a 10px)
  const blurPixels = Math.min(Math.max(blurIntensity, 1), 10) * 2
  
  return (
    <div className="relative">
      {/* Apenas primeira linha do conteúdo visível */}
      <div 
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: previewMode ? '100%' : `${visibleHeight}px` }}
      >
        {children}
      </div>

      {/* Overlay com blur */}
      {!previewMode && (
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-white to-white"
          style={{ 
            backdropFilter: `blur(${blurPixels}px)`,
            WebkitBackdropFilter: `blur(${blurPixels}px)` 
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="flex gap-2">
              {showPreview && (
                <Button
                  onClick={() => setPreviewMode(true)}
                  variant="outline"
                  size="sm"
                >
                  Prévia
                </Button>
              )}
              <Button
                onClick={onSubscribe}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                size="sm"
              >
                Assinar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Botão para retornar à visualização truncada quando em modo de prévia */}
      {previewMode && (
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={() => setPreviewMode(false)}
            size="sm"
            variant="outline"
          >
            Voltar
          </Button>
        </div>
      )}
    </div>
  )
}

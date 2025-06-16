import { useEffect, useRef, useState } from 'react'

export function LoadingPlaceholder() {
  const steps = [
    'Analisando símbolos biológicos',
    'Detectando conflito emocional',
    'Coletando experiências comuns',
    'Identificando padrões de comportamento',
    'Avaliando impacto',
    'Verificando lateralidade'
  ]
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function scheduleNext() {
      const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000
      timerRef.current = setTimeout(() => {
        setCurrent(c => (c + 1) % steps.length)
        scheduleNext()
      }, delay)
    }

    scheduleNext()
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [steps.length])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Texto de status */}
      <p className="text-center text-gray-600 italic">{steps[current]}…</p>

      {/* Skeleton imitando resultado */}
      <div className="animate-pulse bg-white rounded-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

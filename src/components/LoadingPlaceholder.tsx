import { useEffect, useRef, useState } from 'react'

export function LoadingPlaceholder() {
  // 6 passos + frase final
  const steps = [
    'Analisando símbolos biológicos',
    'Detectando conflito emocional',
    'Coletando experiências comuns',
    'Identificando padrões de comportamento',
    'Avaliando impacto',
    'Verificando lateralidade',
    'Processamento quase concluído'
  ]

  const totalDuration = 30_000 // 30 s em ms
  const fadeDuration = 300 // duração do fade in/out em ms
  const stepCount = steps.length
  const perStep = totalDuration / stepCount // aprox. 3714 ms por frase

  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // não faz nada depois da última
    if (currentIndex >= stepCount) return

    const bar = barRef.current!

    // reset: sem transição, largura zero e invisível
    bar.style.transition = 'none'
    bar.style.width = '0%'
    setVisible(false)

    // na próxima pintura, dispara o fade-in e a animação da barra
    requestAnimationFrame(() => {
      bar.style.transition = `width ${perStep}ms linear`
      bar.style.width = '100%'
      setVisible(true)
    })

    // faz fade-out pouco antes de mudar de passo
    const fadeTimer = setTimeout(() => {
      setVisible(false)
    }, perStep - fadeDuration)

    // avança para o próximo passo após perStep
    const stepTimer = setTimeout(() => {
      setCurrentIndex(i => i + 1)
    }, perStep)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(stepTimer)
    }
  }, [currentIndex, perStep, stepCount])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* frase com fade in/out */}
      <p
        className={`text-center text-gray-600 italic transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {steps[Math.min(currentIndex, stepCount - 1)]}…
      </p>

      {/* barra única */}
      <div className="w-full h-2 bg-zinc-200 rounded overflow-hidden">
        <div
          ref={barRef}
          className="h-full bg-primary"
          style={{ width: '0%' }}
        />
      </div>

      {/* skeleton estático abaixo */}
      <div className="animate-pulse bg-white rounded-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    </div>
  )
}

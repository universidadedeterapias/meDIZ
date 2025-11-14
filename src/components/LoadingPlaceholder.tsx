import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/useTranslation'

export function LoadingPlaceholder() {
  const { t } = useTranslation()
  
  // 6 passos + frase final - agora com tradução
  const steps = useMemo(() => [
    t('loading.step1', 'Analisando símbolos biológicos'),
    t('loading.step2', 'Detectando conflito emocional'),
    t('loading.step3', 'Coletando experiências comuns'),
    t('loading.step4', 'Identificando padrões de comportamento'),
    t('loading.step5', 'Avaliando impacto'),
    t('loading.step6', 'Verificando lateralidade'),
    t('loading.step7', 'Processamento quase concluído')
  ], [t])

  const totalDuration = 15_000 // 15 s em ms (reduzido de 30s)
  const fadeDuration = 300 // duração do fade in/out em ms
  const stepCount = steps.length
  const perStep = totalDuration / stepCount // aprox. 3714 ms por frase

  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const barRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // não faz nada depois da última ou se não estiver no cliente
    if (currentIndex >= stepCount || typeof window === 'undefined') return

    const bar = barRef.current!
    
    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      console.warn('LoadingPlaceholder: Timeout de segurança ativado')
      setCurrentIndex(stepCount) // Força o fim do loading
    }, totalDuration + 5000) // 5s a mais que o tempo total

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
      clearTimeout(safetyTimeout)
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

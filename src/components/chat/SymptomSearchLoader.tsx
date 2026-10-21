'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { useTranslation } from '@/i18n/useTranslation'

// Ritmo das frases: a pesquisa leva ~15s, então 7 passos de ~2,2s chegam ao
// último perto do fim e ele fica parado até a resposta, em vez de recomeçar.
const STEP_MS = 2200

/**
 * Frases da análise que acompanham a esfera enquanto a pesquisa por sintoma
 * roda. A esfera em si fica com quem chama, para poder deslizar entre a home e
 * este estado com `layoutId`.
 */
export function SymptomSearchLoader({ question }: { question: string }) {
  const { t } = useTranslation()
  const steps = useMemo(
    () => [
      t('loading.step1', 'Analisando símbolos biológicos'),
      t('loading.step2', 'Detectando conflito emocional'),
      t('loading.step3', 'Coletando experiências comuns'),
      t('loading.step4', 'Identificando padrões de comportamento'),
      t('loading.step5', 'Avaliando impacto'),
      t('loading.step6', 'Verificando lateralidade'),
      t('loading.step7', 'Processamento quase concluído')
    ],
    [t]
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (index >= steps.length - 1) return
    const timer = window.setTimeout(() => setIndex(i => i + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [index, steps.length])

  return (
    <div className="flex w-full flex-col items-center text-center" role="status">
      <p className="line-clamp-2 max-w-md text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {question}
      </p>
      <div className="relative mt-2 h-5 w-full overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-x-0 text-sm text-zinc-500 dark:text-zinc-400"
          >
            {steps[index]}…
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i <= index
                ? 'w-5 bg-violet-500 dark:bg-violet-400'
                : 'w-1.5 bg-violet-200 dark:bg-violet-900'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

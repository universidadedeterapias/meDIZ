// components/SplashScreen.tsx
'use client'

import { useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { BrandAuroraBackground } from '@/components/BrandAuroraBackground'

type Props = { target: string }

export default function SplashScreen({ target }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = target
    }, 2000) // 2 segundos

    return () => clearTimeout(timer)
  }, [target])

  return (
    <BrandAuroraBackground className="flex flex-col items-center justify-center gap-16 p-8 font-[family-name:var(--font-geist-sans)] sm:p-20">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <p className="text-6xl font-bold text-zinc-100 drop-shadow-lg">
          me<span className="uppercase">diz</span>
          <span className="text-[#f5c518]">!</span>
        </p>
      </div>
      <p className="relative z-10 text-lg font-bold text-zinc-100">
        {t('chat.loading.welcome', 'Bem-vindo!')}
      </p>
    </BrandAuroraBackground>
  )
}

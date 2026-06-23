// components/SplashScreen.tsx
'use client'

import { useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'

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
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center gap-16 bg-gradient-to-br from-indigo-600 to-purple-600 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-zinc-100 font-bold text-6xl drop-shadow-lg">
          me<span className="uppercase">diz</span>
          <span className="text-yellow-400">!</span>
        </p>
      </div>
      <p className="text-lg font-bold text-zinc-100">
        {t('chat.loading.welcome', 'Bem-vindo!')}
      </p>
    </div>
  )
}

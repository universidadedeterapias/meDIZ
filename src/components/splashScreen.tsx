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
      className="flex flex-col justify-center items-center
                  min-w-screen min-h-screen p-8 pb-20 gap-16 sm:p-20
                  font-[family-name:var(--font-geist-sans)]
                  bg-gradient-to-br from-indigo-600 to-purple-600"
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-zinc-100 font-bold text-6xl drop-shadow-lg">
          me<span className="uppercase">diz</span>
          <span className="text-yellow-400">!</span>
        </p>
      </div>
      <p className="text-zinc-100 text-lg font-bold">
        {t('chat.loading.welcome', 'Bem-vindo!')}
      </p>
    </div>
  )
}

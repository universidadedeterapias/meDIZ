'use client'

import { LoginForm } from '@/components/login-form'
import { LanguageSwitcher } from '@/components/language-switcher'

export default function LoginPage() {
  return (
    <div
      className="flex flex-col justify-center items-center
                  min-w-screen min-h-screen p-4 pb-16 gap-8 sm:p-8 sm:pb-20 sm:gap-16 md:p-20
                  font-[family-name:var(--font-geist-sans)]
                  bg-gradient-to-br from-indigo-600 to-purple-600
                  relative"
    >
      {/* Seletor de idioma no canto superior direito */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 z-10">
        <LanguageSwitcher showLabel={false} className="w-[100px] sm:w-[120px] md:min-w-[160px]" />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4 sm:gap-6 px-2 sm:px-0">
        <LoginForm />
      </div>
    </div>
  )
}

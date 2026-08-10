'use client'

import { LoginForm } from '@/components/login-form'
import { BrandAuroraBackground } from '@/components/BrandAuroraBackground'

export default function LoginPage() {
  return (
    <BrandAuroraBackground className="flex flex-col items-center justify-center gap-8 p-4 pb-16 font-[family-name:var(--font-geist-sans)] sm:gap-16 sm:p-8 sm:pb-20 md:p-20">
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-4 sm:gap-6 px-2 sm:px-0">
        <LoginForm />
      </div>
    </BrandAuroraBackground>
  )
}

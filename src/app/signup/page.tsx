'use client'

import { SignupForm } from '@/components/register-form'

export default function RegisterPage() {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-gradient-to-br from-indigo-600 to-purple-600 p-4 pb-16 font-[family-name:var(--font-geist-sans)] sm:gap-16 sm:p-8 sm:pb-20 md:p-20"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignupForm />
      </div>
    </div>
  )
}

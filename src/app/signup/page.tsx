'use client'

import { SignupForm } from '@/components/register-form'

export default function RegisterPage() {
  return (
    <div
      className="flex flex-col justify-center items-center
                  min-w-screen min-h-screen p-8 pb-20 gap-16 sm:p-20
                  font-[family-name:var(--font-geist-sans)]
                  bg-gradient-to-br from-indigo-600 to-purple-600"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignupForm />
      </div>
    </div>
  )
}

'use client'

import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <div
      className="flex flex-col justify-center items-center
                  min-w-screen min-h-screen p-8 pb-20 gap-16 sm:p-20
                  font-[family-name:var(--font-geist-sans)]
                  bg-gradient-to-br from-indigo-600 to-purple-600"
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        {/* <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEnd className="size-4" />
          </div>
        </a> */}
        <LoginForm />
      </div>
    </div>
  )
}

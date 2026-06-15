'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Shell do chat v2 — lavanda no light, roxo profundo no dark */
export function MedizChatV2Shell({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mediz-chat-v2 relative isolate flex min-h-full flex-col',
        'bg-gradient-to-b from-[#e6dcf5] via-[#f3ecfa] to-[#faf7ff]',
        'text-[#4a1d96]',
        'dark:from-[#140c22] dark:via-[#0f0a18] dark:to-[#08050f]',
        'dark:text-violet-100',
        className
      )}
    >
      {children}
    </div>
  )
}

export function MedizChatV2Logo() {
  return (
    <div className="flex flex-col items-center leading-none">
      <p className="text-[1.65rem] font-bold tracking-tight sm:text-[1.85rem]">
        <span className="text-[#2d1b4e] dark:text-white">me</span>
        <span className="uppercase text-[#9b2fe1] dark:text-[#c084fc]">diz</span>
        <span className="text-[#f5c518]">!</span>
      </p>
      <p className="mt-1 text-[10px] font-medium tracking-[0.28em] text-[#7c5cad] dark:text-violet-400">
        — VERSÃO 2.0 —
      </p>
    </div>
  )
}

export function MedizChatV2HeaderGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden">
      <div className="relative mt-2 h-24 w-full max-w-lg">
        <div className="absolute left-1/2 top-2 h-16 w-16 -translate-x-1/2 rounded-full bg-[#c084fc]/50 blur-2xl dark:bg-[#7c3aed]/35" />
        <div className="absolute left-1/2 top-5 h-8 w-8 -translate-x-1/2 rounded-full bg-[#fde047]/70 blur-md dark:bg-[#facc15]/40" />
        <svg
          className="absolute inset-x-4 top-10 h-12 w-[calc(100%-2rem)] text-[#c4b5fd]/60 dark:text-violet-500/40"
          viewBox="0 0 400 48"
          fill="none"
          aria-hidden
        >
          <path
            d="M0 24C50 8 100 40 150 24C200 8 250 40 300 24C350 8 400 32 400 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0 36C60 22 120 42 180 30C240 18 300 42 360 28"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  )
}

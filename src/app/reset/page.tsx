'use client'

import { Suspense } from 'react'
import ResetFormClient from './ResetFormClient'

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          Carregando…
        </div>
      }
    >
      <ResetFormClient />
    </Suspense>
  )
}

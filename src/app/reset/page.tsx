'use client'

import { Suspense } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import ResetFormClient from './ResetFormClient'

function ResetPageContent() {
  const { t } = useTranslation()
  
  return (
    <div className="relative min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            {t('reset.loading', 'Carregando…')}
          </div>
        }
      >
        <ResetFormClient />
      </Suspense>
    </div>
  )
}

export default function ResetPage() {
  return <ResetPageContent />
}

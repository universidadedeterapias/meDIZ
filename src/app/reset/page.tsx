'use client'

import { Suspense } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { LanguageSwitcher } from '@/components/language-switcher'
import ResetFormClient from './ResetFormClient'

function ResetPageContent() {
  const { t } = useTranslation()
  
  return (
    <div className="relative min-h-screen">
      {/* Seletor de idioma no canto superior direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <LanguageSwitcher showLabel={false} className="min-w-[120px] sm:min-w-[160px]" />
      </div>
      
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

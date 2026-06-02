'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

export type PageBackButtonProps = {
  /** Destino quando não há histórico no navegador */
  fallbackHref?: string
  className?: string
  variant?: 'ghost' | 'outline' | 'secondary'
  showLabel?: boolean
}

export function PageBackButton({
  fallbackHref = '/chat',
  className,
  variant = 'ghost',
  showLabel = false
}: PageBackButtonProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const label = t('general.back', 'Voltar')

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? 'sm' : 'icon'}
      onClick={handleBack}
      className={cn(
        'shrink-0 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/50',
        className
      )}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel ? <span className="ml-1">{label}</span> : null}
    </Button>
  )
}

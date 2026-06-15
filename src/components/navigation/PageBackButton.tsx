'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

export type PageBackButtonProps = {
  /** Destino quando não há histórico no navegador */
  fallbackHref?: string
  /** Link direto (sem router.back) */
  href?: string
  className?: string
  variant?: 'ghost' | 'outline' | 'secondary'
  /** Exibe o texto "Voltar" — padrão true para melhor visibilidade no mobile */
  showLabel?: boolean
}

const backButtonClassName = cn(
  'shrink-0 gap-1.5 border-indigo-300/80 bg-background font-semibold text-indigo-800 shadow-md',
  'hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-950',
  'dark:border-indigo-600 dark:bg-card dark:text-indigo-100 dark:hover:bg-indigo-950/70',
  'min-h-10 min-w-10'
)

function BackContent({
  label,
  showLabel
}: {
  label: string
  showLabel: boolean
}) {
  return (
    <>
      <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
      {showLabel ? <span className="text-sm leading-none">{label}</span> : null}
    </>
  )
}

export function PageBackButton({
  fallbackHref = '/chat',
  href,
  className,
  variant = 'outline',
  showLabel = true
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

  const size = showLabel ? 'sm' : 'icon'
  const classes = cn(backButtonClassName, showLabel ? 'px-3' : '', className)

  if (href) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        className={classes}
      >
        <Link href={href} aria-label={label}>
          <BackContent label={label} showLabel={showLabel} />
        </Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleBack}
      className={classes}
      aria-label={label}
    >
      <BackContent label={label} showLabel={showLabel} />
    </Button>
  )
}

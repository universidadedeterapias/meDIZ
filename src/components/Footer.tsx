'use client'

// components/Footer.tsx

import { useTranslation } from '@/i18n/useTranslation'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="w-full py-4 bg-transparent">
      <div className="max-w-4xl mx-auto text-center space-y-1">
        <p className="text-xs text-zinc-400">
          meDIZ! © {year} - {t('footer.rights', 'Todos os direitos reservados.')}
        </p>
        <p className="text-xs text-zinc-400">
          {t('footer.company', 'Universidade de Terapias – CNPJ 27.926.887/0001-08')}
        </p>
      </div>
    </footer>
  )
}

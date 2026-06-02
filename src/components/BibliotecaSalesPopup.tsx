'use client'

import { BookOpen, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog-mobile'
import { useTranslation } from '@/i18n/useTranslation'

interface BibliotecaSalesPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const HOTMART_URL =
  process.env.NEXT_PUBLIC_HOTMART_SALES_URL || 'https://pay.hotmart.com/'

export default function BibliotecaSalesPopup({
  open,
  onOpenChange
}: BibliotecaSalesPopupProps) {
  const { t } = useTranslation()

  const handleCta = () => {
    window.open(HOTMART_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-3 w-[calc(100%-1.5rem)] max-w-md sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">
            {t(
              'library.sales.title',
              'Desbloqueie sua Biblioteca'
            )}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-4">
          {t(
            'library.sales.description',
            'Conteúdos exclusivos para quem adquiriu o livro na Hotmart:'
          )}
        </p>

        <ul className="space-y-3 mb-6">
          <li className="flex items-center gap-3 text-sm">
            <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
            <span>{t('library.sales.pdf', 'Material em PDF')}</span>
          </li>
          <li className="flex items-center gap-3 text-sm">
            <BookOpen className="h-5 w-5 text-indigo-600 shrink-0" />
            <span>{t('library.sales.livroDigital', 'Livro Digital')}</span>
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={handleCta}
          >
            {t('library.sales.cta', 'Comprar agora')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            {t('library.sales.close', 'Fechar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

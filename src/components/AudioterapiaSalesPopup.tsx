'use client'

import { Headphones, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog-mobile'
import { useTranslation } from '@/i18n/useTranslation'

interface AudioterapiaSalesPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const HOTMART_URL =
  process.env.NEXT_PUBLIC_HOTMART_SALES_URL || 'https://pay.hotmart.com/'

export default function AudioterapiaSalesPopup({
  open,
  onOpenChange
}: AudioterapiaSalesPopupProps) {
  const { t } = useTranslation()

  const handleCta = () => {
    window.open(HOTMART_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-3 w-[calc(100%-1.5rem)] max-w-md sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 text-xl font-semibold">
            {t('audioterapia.sales.title', 'Desbloqueie a Audioterapia')}
          </DialogTitle>
        </DialogHeader>

        <p className="mb-4 text-sm text-muted-foreground">
          {t(
            'audioterapia.sales.description',
            'Áudio guiado de apoio terapêutico exclusivo para quem adquiriu na Hotmart.'
          )}
        </p>

        <ul className="mb-6 space-y-3">
          <li className="flex items-center gap-3 text-sm">
            <Headphones className="h-5 w-5 shrink-0 text-violet-600" />
            <span>
              {t(
                'audioterapia.sales.benefit',
                'Sessões de audioterapia no idioma do app'
              )}
            </span>
          </li>
        </ul>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700"
            onClick={handleCta}
          >
            {t('audioterapia.sales.cta', 'Comprar agora')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            {t('audioterapia.sales.close', 'Fechar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

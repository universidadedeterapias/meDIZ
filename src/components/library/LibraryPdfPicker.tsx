'use client'

import { FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog-mobile'

export type PdfLink = { url: string; label: string }

interface LibraryPdfPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: PdfLink[]
  title: string
  subtitle?: string
  closeLabel?: string
}

export function LibraryPdfPicker({
  open,
  onOpenChange,
  items,
  title,
  subtitle = 'Escolha qual material deseja abrir:',
  closeLabel = 'Fechar'
}: LibraryPdfPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600 mb-4">{subtitle}</p>
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`}>
              <Button
                className="w-full justify-start gap-3 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  window.open(item.url, '_blank', 'noopener,noreferrer')
                }}
              >
                <FileText className="h-4 w-4 shrink-0" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="ghost" className="w-full mt-2" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4 mr-2" />
          {closeLabel}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// components/ShareInsightDialog.tsx
'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { SocialIcon } from 'react-social-icons'
import { useTranslation } from '@/i18n/useTranslation'

interface ShareInsightDialogProps {
  title: string
  text: string
  url: string
  triggerClassName?: string
}

function openDeepLink(appUrl: string, webUrl: string) {
  // Verifica se está no cliente antes de usar window
  if (typeof window === 'undefined') return
  
  // tenta abrir o app
  window.location.href = appUrl
  // se não abrir em 500ms, vai para o web fallback
  setTimeout(() => {
    window.location.href = webUrl
  }, 500)
}

export function ShareInsightDialog({
  title,
  text,
  url,
  triggerClassName
}: ShareInsightDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName ?? ''}>
          <Share2 />
          <span>{t('share.title', 'Compartilhar')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="bg-zinc-100 rounded-lg p-4 mb-4">
          <p className="font-semibold">{title}</p>
          <p className="mt-2">{text}</p>
          <p className="mt-4 text-xs text-zinc-500 break-all">{url}</p>
        </div>

        <div className="grid grid-cols-4 gap-6 justify-items-center">
          {/* Instagram */}
          <button
            onClick={() => {
              // Verifica se está no cliente antes de usar navigator
              if (typeof window === 'undefined') return
              
              // primeiro tenta Web Share API (iOS/Android)
              if (navigator.share) {
                navigator.share({ title, text, url }).catch(() => {
                  // se falhar, abre o app ou web
                  openDeepLink('instagram://app', 'https://instagram.com')
                })
              } else {
                // sem Web Share API: tenta app/fallback web
                openDeepLink('instagram://app', 'https://instagram.com')
              }
            }}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="instagram" style={{ width: 32, height: 32 }} />
            <span className="text-xs">Instagram</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={() =>
              openDeepLink(
                `whatsapp://send?text=${encodedText}%0A${encodedUrl}`,
                `https://api.whatsapp.com/send?text=${encodedText}%0A${encodedUrl}`
              )
            }
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="whatsapp" style={{ width: 32, height: 32 }} />
            <span className="text-xs">WhatsApp</span>
          </button>

          {/* Telegram */}
          <button
            onClick={() =>
              openDeepLink(
                `tg://msg?text=${encodedText}%0A${encodedUrl}`,
                `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
              )
            }
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="telegram" style={{ width: 32, height: 32 }} />
            <span className="text-xs">Telegram</span>
          </button>

          {/* Facebook */}
          <button
            onClick={() =>
              openDeepLink(
                `fb://facewebmodal/f?href=${encodedUrl}`,
                `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`
              )
            }
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="facebook" style={{ width: 32, height: 32 }} />
            <span className="text-xs">Facebook</span>
          </button>

          {/* Twitter */}
          <button
            onClick={() =>
              openDeepLink(
                `twitter://post?message=${encodedText}%0A${encodedUrl}`,
                `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
              )
            }
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="twitter" style={{ width: 32, height: 32 }} />
            <span className="text-xs">Twitter</span>
          </button>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodedTitle}&body=${encodedText}%0A${encodedUrl}`}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="email" style={{ width: 32, height: 32 }} />
            <span className="text-xs">Email</span>
          </a>

          {/* Copiar */}
          <button
            onClick={() => {
              // Verifica se está no cliente antes de usar navigator
              if (typeof window === 'undefined') return
              navigator.clipboard.writeText(`${text} ${url}`)
            }}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon network="sharethis" style={{ width: 32, height: 32 }} />
            <span className="text-xs">{t('share.copy', 'Copiar')}</span>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="bg-zinc-100"
            onClick={() => setOpen(false)}
          >
            {t('share.close', 'Fechar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

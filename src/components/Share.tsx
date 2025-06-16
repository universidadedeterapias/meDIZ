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

interface ShareInsightDialogProps {
  title: string
  text: string
  url: string
  triggerClassName?: string
}

export function ShareInsightDialog({
  title,
  text,
  url,
  triggerClassName
}: ShareInsightDialogProps) {
  const [open, setOpen] = useState(false)

  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(url)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName ?? ''}>
          <Share2 />
          <span>Compartilhar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Preview do texto + link */}
        <div className="bg-zinc-100 rounded-lg p-4 mb-4">
          <p className="font-semibold">{title}</p>
          <p className="mt-2">{text}</p>
          <p className="mt-4 text-xs text-zinc-500 break-all">{url}</p>
        </div>

        <div className="grid grid-cols-4 gap-6 justify-items-center">
          {/* Instagram */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ text, url }).catch(() => {})
              } else {
                window.open(url, '_blank')
              }
            }}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url="https://instagram.com"
              network="instagram"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Instagram</span>
          </button>

          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url="https://facebook.com"
              network="facebook"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Facebook</span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodedText}%0A${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url="https://whatsapp.com"
              network="whatsapp"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url="https://telegram.org"
              network="telegram"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Telegram</span>
          </a>

          {/* Twitter */}
          <a
            href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url="https://twitter.com"
              network="twitter"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Twitter</span>
          </a>

          {/* Email */}
          <a
            href={`mailto:?subject=${encodeURIComponent(
              title
            )}&body=${encodedText}%0A${encodedUrl}`}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url={`mailto:?subject=${encodeURIComponent(
                title
              )}&body=${encodedText}%0A${encodedUrl}`}
              network="email"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Email</span>
          </a>

          {/* Copiar */}
          <button
            onClick={() => navigator.clipboard.writeText(`${text} ${url}`)}
            className="flex flex-col items-center space-y-1"
          >
            <SocialIcon
              url=""
              network="sharethis"
              style={{ width: 32, height: 32 }}
            />
            <span className="text-xs">Copiar</span>
          </button>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="bg-zinc-100"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

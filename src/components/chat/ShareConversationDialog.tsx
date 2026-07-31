'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, Share2 } from 'lucide-react'
import { SocialIcon } from 'react-social-icons'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  ShareConversationCard
} from '@/components/chat/ShareConversationCard'
import type { SpecialistAgent } from '@/lib/conversational-chat/config'

const SHARE_LINK = 'https://mediz.app'
const SHARE_LINK_LABEL = 'mediz.app'

function toPlainExcerpt(markdown: string, maxLen = 320): string {
  const plain = markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[-*•]\s+/gm, '')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/\r/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()

  if (plain.length <= maxLen) return plain
  const cut = plain.lastIndexOf(' ', maxLen)
  return `${plain.slice(0, cut > 0 ? cut : maxLen).trim()}…`
}

function openDeepLink(appUrl: string, webUrl: string) {
  if (typeof window === 'undefined') return
  window.location.href = appUrl
  setTimeout(() => {
    window.location.href = webUrl
  }, 500)
}

type ShareConversationDialogProps = {
  agent: SpecialistAgent
  content: string
  label?: string
}

export function ShareConversationDialog({
  agent,
  content,
  label
}: ShareConversationDialogProps) {
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const generatingRef = useRef(false)

  const shareText = label || 'Vem ver o que descobri no meDIZ!'
  const shareUrl = `${SHARE_LINK}/?utm_source=chat_share&utm_medium=share&utm_campaign=${agent}`
  const excerpt = toPlainExcerpt(content)
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(shareUrl)

  // Pre-carrega o modulo do html-to-image assim que o botao "Compartilhar"
  // existe na tela (nao so quando o dialog abre) — o import dinamico fica em
  // cache, entao quando o usuario realmente abrir o dialog o download/parse
  // do pacote ja aconteceu e sobra so o tempo real de captura do card.
  useEffect(() => {
    void import('html-to-image')
  }, [])

  useEffect(() => {
    // Guarda de concorrencia via ref (nao state): se "generating" (state) entrasse
    // no array de dependencias abaixo, o proprio setGenerating(true) dispararia
    // este efeito de novo, rodando o cleanup (cancelled = true) do closure em
    // andamento antes mesmo do import/captura terminar — travando "Gerando
    // imagem..." para sempre, ja que o finally so zera o loading quando !cancelled.
    if (!open || imageUrl || generatingRef.current) return

    let cancelled = false
    generatingRef.current = true
    setGenerating(true)

    async function generate() {
      try {
        const { toBlob } = await import('html-to-image')
        if (!cardRef.current || cancelled) return
        const blob = await toBlob(cardRef.current, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: CARD_WIDTH,
          height: CARD_HEIGHT
        })
        if (!blob || cancelled) return
        setImageUrl(URL.createObjectURL(blob))
        setImageFile(new File([blob], 'meDIZ.png', { type: 'image/png' }))
      } catch (err) {
        console.error('Erro ao gerar imagem de compartilhamento:', err)
      } finally {
        generatingRef.current = false
        if (!cancelled) setGenerating(false)
      }
    }

    generate()
    return () => {
      cancelled = true
    }
  }, [open, imageUrl])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const isReady = imageUrl !== null

  const canShareFile =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    imageFile !== null &&
    navigator.canShare({ files: [imageFile] })

  const handleNativeShare = async () => {
    if (!imageFile) return
    try {
      await navigator.share({
        title: 'meDIZ!',
        text: shareText,
        url: shareUrl,
        files: [imageFile]
      })
    } catch {
      // usuário cancelou o compartilhamento nativo, sem necessidade de fallback
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-left shadow-lg shadow-violet-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white transition-transform duration-300 group-hover:scale-110">
            <Share2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">
              {label || 'Compartilhar essa conversa'}
            </span>
            <span className="block truncate text-xs text-white/75">
              Ajude outras pessoas a se cuidarem também
            </span>
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md rounded">
        <DialogHeader>
          <DialogTitle>Compartilhar</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center overflow-hidden rounded-2xl bg-zinc-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Prévia do compartilhamento"
              className="max-h-80 w-auto"
            />
          ) : (
            <div className="flex h-60 w-full items-center justify-center text-sm text-zinc-500">
              {generating ? 'Gerando imagem…' : 'Preparando…'}
            </div>
          )}
        </div>

        {!isReady ? (
          <div className="flex h-[76px] w-full items-center justify-center gap-2 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            Preparando opções de compartilhamento…
          </div>
        ) : canShareFile ? (
          <Button onClick={handleNativeShare} className="w-full gap-2">
            <Share2 className="size-4" />
            Compartilhar
          </Button>
        ) : (
          <div className="grid grid-cols-5 gap-4 justify-items-center">
            <a
              href={imageUrl}
              download="meDIZ.png"
              className="flex flex-col items-center space-y-1"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-700">
                <Download className="size-4" />
              </span>
              <span className="text-xs">Baixar</span>
            </a>

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

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
              }}
              className="flex flex-col items-center space-y-1"
            >
              <SocialIcon network="sharethis" style={{ width: 32, height: 32 }} />
              <span className="text-xs">Copiar</span>
            </button>
          </div>
        )}

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

      {/* Card off-screen, capturado via html2canvas para gerar a imagem */}
      <div
        style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        <ShareConversationCard
          ref={cardRef}
          agent={agent}
          excerpt={excerpt}
          linkLabel={SHARE_LINK_LABEL}
        />
      </div>
    </Dialog>
  )
}

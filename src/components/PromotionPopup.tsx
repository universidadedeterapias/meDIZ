'use client'

import { X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PopupConfig {
  id: string
  title: string
  content: string
  imageUrl?: string
  subscribeLink: string
}

interface PromotionPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubscribe: () => void
}

export default function PromotionPopup({
  open,
  onOpenChange,
  onSubscribe
}: PromotionPopupProps) {
  const [popupConfig, setPopupConfig] = useState<PopupConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPopupConfig = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/popup')
      
      if (!response.ok) {
        // Se não encontrar configuração, apenas fecha o popup
        if (response.status === 404) {
          onOpenChange(false)
          return
        }
        throw new Error('Erro ao buscar configuração do popup')
      }
      
      const data = await response.json()
      setPopupConfig(data)
      setError(null)
    } catch (err) {
      setError('Não foi possível carregar o conteúdo promocional')
      console.error('Erro ao buscar popup:', err)
    } finally {
      setLoading(false)
    }
  }, [onOpenChange])

  // Busca a configuração do popup quando o componente é montado
  useEffect(() => {
    if (open) {
      fetchPopupConfig()
    }
  }, [open, fetchPopupConfig])

  const handleSubscribe = () => {
    if (popupConfig?.subscribeLink) {
      window.open(popupConfig.subscribeLink, '_blank')
    }
    onSubscribe()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-indigo-600">
              {loading ? 'Carregando...' : popupConfig?.title || 'Oferta especial'}
            </DialogTitle>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-500">{error}</div>
        ) : (
          <div className="flex flex-col gap-6">
            {popupConfig?.imageUrl && (
              <div className="relative w-full h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px]">
                <Image
                  src={popupConfig.imageUrl}
                  alt="Promoção"
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-lg"
                  sizes="(max-width: 640px) 90vw, (max-width: 768px) 80vw, (max-width: 1024px) 70vw, 600px"
                  onError={(e) => {
                    console.warn('Erro ao carregar imagem do popup:', popupConfig.imageUrl)
                    // Esconde a imagem em caso de erro
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            
            <div className="prose prose-sm sm:prose-base max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {popupConfig?.content || ''}
              </ReactMarkdown>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="w-full sm:w-1/2 h-12 text-base"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
              <Button
                className="w-full sm:w-1/2 h-12 text-base bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={handleSubscribe}
              >
                Assinar Agora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

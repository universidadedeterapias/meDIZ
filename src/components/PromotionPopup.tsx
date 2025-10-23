'use client'

import { X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog-mobile'
// import ReactMarkdown from 'react-markdown'
// import remarkGfm from 'remark-gfm'

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
      <DialogContent 
        className="sm:max-w-lg max-w-[90vw] max-h-[90vh] overflow-y-auto p-4"
        hideCloseButton={true}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-indigo-600">
              {loading ? 'Carregando...' : popupConfig?.title || 'Oferta especial'}
            </DialogTitle>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 rounded-full ml-2 flex-shrink-0"
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
          <div className="flex flex-col gap-2">
            
            {popupConfig?.imageUrl && (
              <div className="relative w-full h-[280px] sm:h-[320px]">
                <Image
                  src={popupConfig.imageUrl}
                  alt="Promoção"
                  width={500}
                  height={320}
                  className="w-full h-full object-contain rounded-md"
                  unoptimized={true}
                />
              </div>
            )}
            
            <div className="prose prose-xs max-w-none text-xs leading-tight">
              {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {popupConfig?.content || ''}
              </ReactMarkdown> */}
              <div dangerouslySetInnerHTML={{ __html: popupConfig?.content || '' }} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                className="w-full sm:w-1/2 bg-indigo-600 text-white hover:bg-indigo-700 order-1"
                onClick={handleSubscribe}
              >
                Assinar Agora
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-1/2 order-2"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UpgradeModal } from '@/components/UpgradeModal'
import { PDFConfigModal } from '@/components/PDFConfigModal'
import { useSubscriptionStatus } from '@/hooks/use-subscription-status'
import { FileText, Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

interface ExportPDFButtonProps {
  question: string
  answer: string
  sessionId?: string
  className?: string
}

/**
 * Botão para exportar consulta do chat como PDF
 * Verifica assinatura e exibe modal de configuração ou upgrade
 */
export function ExportPDFButton({ 
  question, 
  answer, 
  sessionId,
  className = ''
}: ExportPDFButtonProps) {
  const { isPremium, isLoading } = useSubscriptionStatus()
  const { t } = useTranslation()
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)

  const handleExport = async () => {
    if (isLoading) return

    if (!isPremium) {
      setShowUpgradeModal(true)
      return
    }

    // Abre modal de configuração para usuários premium
    setShowConfigModal(true)
  }

  // Não renderiza se ainda está carregando o status da assinatura
  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className={`text-red-600 border-red-200 bg-red-50 relative ${className}`}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">PDF</span>
        </div>
        <div className="absolute -top-4 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse shadow-lg z-10">
          {t('pdf.button.new', 'NOVO')}
        </div>
      </Button>
    )
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className={`text-red-600 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all duration-200 relative ${className}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">PDF</span>
              </div>
              <div className="absolute -top-4 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse shadow-lg z-10">
                {t('pdf.button.new', 'NOVO')}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isPremium 
                ? t('pdf.button.tooltip.premium', '✨ Nova funcionalidade! Exportar como PDF')
                : t('pdf.button.tooltip.free', '✨ Nova funcionalidade! Disponível para plano profissional')
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <UpgradeModal 
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />

      <PDFConfigModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        question={question}
        answer={answer}
        sessionId={sessionId}
      />
    </>
  )
}

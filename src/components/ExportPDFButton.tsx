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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)

  const handleExport = () => {
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
        className={`text-indigo-600 border-indigo-200 bg-indigo-50 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm font-medium">PDF</span>
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
              className={`text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all duration-200 ${className}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">PDF</span>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isPremium 
                ? 'Exportar como PDF' 
                : 'Função disponível para plano profissional'
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

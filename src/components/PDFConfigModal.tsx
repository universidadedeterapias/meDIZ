'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateChatPDF } from '@/lib/pdfGenerator'
import { FileText, User, Calendar, MessageSquare } from 'lucide-react'
import { useLanguage } from '@/i18n/useLanguage'
import { useTranslation } from '@/i18n/useTranslation'

interface PDFConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: string
  answer: string
  sessionId?: string
}

/**
 * Modal para configurar dados do PDF antes da exportação
 * Inclui campo para nome do paciente e melhor organização
 */
export function PDFConfigModal({ 
  open, 
  onOpenChange, 
  question, 
  answer, 
  sessionId 
}: PDFConfigModalProps) {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const [patientName, setPatientName] = useState('')
  const [therapistName, setTherapistName] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  // removido estado de loading de terapeuta (não utilizado visualmente)

  // Busca o nome do terapeuta do cadastro do usuário (banco de dados)
  useEffect(() => {
    const fetchTherapistName = async () => {
      // loading local não exibido, remover
      try {
        const res = await fetch('/api/user')
        if (res.ok) {
          const userData = await res.json()
          // Prioriza fullName, depois name, depois fallback
          const name = userData.fullName || userData.name || 'Terapeuta'
          setTherapistName(name)
        } else {
          setTherapistName('Terapeuta')
        }
      } catch (error) {
        console.error('Erro ao buscar nome do terapeuta:', error)
        setTherapistName('Terapeuta')
      } finally {
        // noop
      }
    }

    if (open) {
      fetchTherapistName()
    }
  }, [open])

  const handleExport = async () => {
    setIsGenerating(true)
    
    try {
      await generateChatPDF({
        question,
        answer,
        timestamp: new Date(),
        sessionId,
        patientName: patientName.trim() || undefined,
        therapistName: therapistName.trim() || undefined,
        language
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full">
              <FileText className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-indigo-600">
            {t('pdf.config.title', 'Configurar Exportação PDF')}
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            {t('pdf.config.description', 'Personalize as informações que aparecerão no PDF da consulta.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {/* Nome da Terapeuta */}
          <div className="space-y-2">
            <Label htmlFor="therapistName" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-indigo-600" />
              {t('pdf.config.therapistName', 'Nome da Terapeuta')}
            </Label>
            <Input
              id="therapistName"
              placeholder={t('pdf.config.therapistNamePlaceholder', 'Digite o nome da terapeuta')}
              value={therapistName}
              onChange={(e) => setTherapistName(e.target.value)}
              className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500">
              {t('pdf.config.therapistNameHint', 'Aparecerá como título grande logo abaixo da logo no PDF')}
            </p>
          </div>

          {/* Nome do Paciente */}
          <div className="space-y-2">
            <Label htmlFor="patientName" className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-indigo-600" />
              {t('pdf.config.patientName', 'Nome do Paciente (opcional)')}
            </Label>
            <Input
              id="patientName"
              placeholder={t('pdf.config.patientNamePlaceholder', 'Digite o nome do paciente')}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500">
              {t('pdf.config.patientNameHint', 'Se preenchido, aparecerá no cabeçalho do PDF')}
            </p>
          </div>

          {/* Preview da Consulta */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              {t('pdf.config.summary', 'Resumo da Consulta')}
            </Label>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-gray-700">
                <strong>{t('pdf.config.question', 'Pergunta:')}</strong> {question.length > 50 ? `${question.substring(0, 50)}...` : question}
              </div>
              {patientName && (
                <div className="text-indigo-600 mt-1">
                  <strong>{t('pdf.config.patient', 'Paciente:')}</strong> {patientName}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            {t('general.cancel', 'Cancelar')}
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isGenerating}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('pdf.config.generating', 'Gerando PDF...')}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                {t('pdf.config.export', 'Exportar PDF')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

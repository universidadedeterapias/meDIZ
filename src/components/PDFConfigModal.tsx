'use client'

/// <reference lib="dom" />

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
import { FileText, User, Calendar, MessageSquare } from 'lucide-react'
import { useLanguage } from '@/i18n/useLanguage'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/lib/utils'

// Campos do modal em vidro: claros e translúcidos, violeta no foco.
const labelClass =
  'flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200'
const iconClass = 'h-4 w-4 text-violet-600 dark:text-violet-300'
const inputClass =
  'h-11 rounded-2xl border-white/70 bg-white/70 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-0 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:placeholder:text-zinc-500'
const hintClass = 'text-xs text-zinc-500 dark:text-zinc-400'

interface PDFConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: string
  answer: string
}

/**
 * Modal para configurar dados do PDF antes da exportação
 * Inclui campo para nome do paciente e melhor organização
 */
export function PDFConfigModal({ 
  open,
  onOpenChange,
  question,
  answer
}: PDFConfigModalProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [patientName, setPatientName] = useState('')
  const [therapistName, setTherapistName] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  // removido estado de loading de terapeuta (não utilizado visualmente)

  // Busca o nome do terapeuta do cadastro do usuário (banco de dados)
  useEffect(() => {
    const fetchTherapistName = async () => {
      // loading local não exibido, remover
      try {
        // Timeout de 30 segundos para carregamento de dados do usuário
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos
        
        const res = await fetch('/api/user', {
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId)
        })
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
      // Validação básica
      if (!question || !answer) {
        throw new Error('Pergunta e resposta são obrigatórias para gerar o PDF')
      }

      // A geração roda no servidor (pdfkit): é lá que o gate premium é real e que
      // os rótulos saem traduzidos pelo idioma da sessão.
      const response = await fetch('/api/chat/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          patientName: patientName.trim() || undefined,
          therapistName: therapistName.trim() || undefined,
          language
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao gerar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `relatorio-de-origem-emocional-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)

      onOpenChange(false)
    } catch (error) {
      // Garante que sempre temos uma mensagem de erro válida
      const errorMessage = error instanceof Error 
        ? error.message 
        : String(error) || 'Erro desconhecido ao exportar PDF'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      console.error('[PDFConfigModal] ❌ Erro ao exportar PDF:', errorMessage)
      if (errorStack) {
        console.error('Stack trace:', errorStack)
      }
      
      // Mostra erro ao usuário
      alert(`Erro ao exportar PDF: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-violet-950/20 backdrop-blur-[2px] dark:bg-black/50"
        className={cn(
          'w-[calc(100%-2rem)] gap-0 rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-2xl shadow-violet-950/15 backdrop-blur-2xl backdrop-saturate-150 sm:max-w-md sm:rounded-[1.75rem] sm:p-6',
          'dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-black/40',
          '[&>button]:rounded-full [&>button]:text-zinc-500 dark:[&>button]:text-zinc-400'
        )}
      >
        <DialogHeader className="space-y-0">
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 p-3 shadow-lg shadow-violet-600/30 ring-1 ring-inset ring-white/20 dark:from-violet-500 dark:to-purple-500">
              <FileText className="h-7 w-7 text-white" strokeWidth={1.8} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t('pdf.config.title', 'Configurar Exportação PDF')}
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {t('pdf.config.description', 'Personalize as informações que aparecerão no PDF da consulta.')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {/* Nome da Terapeuta */}
          <div className="space-y-1.5">
            <Label htmlFor="therapistName" className={labelClass}>
              <User className={iconClass} />
              {t('pdf.config.therapistName', 'Nome da Terapeuta')}
            </Label>
            <Input
              id="therapistName"
              placeholder={t('pdf.config.therapistNamePlaceholder', 'Digite o nome da terapeuta')}
              value={therapistName}
              onChange={(e) => setTherapistName(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              {t('pdf.config.therapistNameHint', 'Aparecerá como título grande logo abaixo da logo no PDF')}
            </p>
          </div>

          {/* Nome do Paciente */}
          <div className="space-y-1.5">
            <Label htmlFor="patientName" className={labelClass}>
              <User className={iconClass} />
              {t('pdf.config.patientName', 'Nome do Paciente (opcional)')}
            </Label>
            <Input
              id="patientName"
              placeholder={t('pdf.config.patientNamePlaceholder', 'Digite o nome do paciente')}
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={inputClass}
            />
            <p className={hintClass}>
              {t('pdf.config.patientNameHint', 'Se preenchido, aparecerá no cabeçalho do PDF')}
            </p>
          </div>

          {/* Preview da Consulta */}
          <div className="space-y-1.5">
            <Label className={labelClass}>
              <MessageSquare className={iconClass} />
              {t('pdf.config.summary', 'Resumo da Consulta')}
            </Label>
            <div className="rounded-2xl bg-violet-50/70 p-3 text-sm ring-1 ring-inset ring-violet-100 dark:bg-white/5 dark:ring-white/10">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-zinc-700 dark:text-zinc-200">
                <strong>{t('pdf.config.question', 'Pergunta:')}</strong> {question.length > 50 ? `${question.substring(0, 50)}...` : question}
              </div>
              {patientName && (
                <div className="mt-1 text-violet-700 dark:text-violet-300">
                  <strong>{t('pdf.config.patient', 'Paciente:')}</strong> {patientName}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2 sm:space-x-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="rounded-2xl bg-white/60 text-zinc-700 hover:bg-white/90 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
          >
            {t('general.cancel', 'Cancelar')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isGenerating}
            className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/30 hover:from-violet-500 hover:to-purple-500 dark:from-violet-500 dark:to-purple-500"
          >
            {isGenerating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                {t('pdf.config.generating', 'Gerando PDF...')}
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {t('pdf.config.export', 'Exportar PDF')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

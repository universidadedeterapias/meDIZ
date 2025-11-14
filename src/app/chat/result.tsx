'use client'

import { BlurredAccordionContent } from '@/components/BlurredContent'
import { ClientOnly } from '@/components/ClientOnly'
import { ExportPDFButton } from '@/components/ExportPDFButton'
import { SaveSymptomDialog } from '@/components/SaveSymptomDialog'
import { ShareInsightDialog } from '@/components/Share'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import parseResponse from '@/lib/parseResponse'
import { processMarkdownContent } from '@/lib/markdownProcessor'
import { UserPeriod } from '@/lib/userPeriod'
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  ChartLine,
  Clock,
  Dna,
  HeartPulse,
  Lightbulb,
  MessageCircleQuestion,
  TriangleAlert,
  Workflow
} from 'lucide-react'
import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { useLanguage } from '@/i18n/useLanguage'
import type { LanguageCode } from '@/i18n/config'

// Mapa de string → componente, mantém tudo num lugar
const ICON_MAP: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  dna: Dna,
  'triangle-alert': TriangleAlert,
  lightbulb: Lightbulb,
  brain: Brain,
  workflow: Workflow,
  'arrow-right-left': ArrowRightLeft,
  'chart-line': ChartLine,
  activity: Activity,
  'heart-pulse': HeartPulse,
  'circle-question-mark': MessageCircleQuestion
}

// Mapeamento de tradução dos títulos das seções
const SECTION_TITLE_TRANSLATIONS: Record<string, Record<LanguageCode, string>> = {
  'Símbolos Biológicos': {
    'pt-BR': 'Símbolos Biológicos',
    'pt-PT': 'Símbolos Biológicos',
    en: 'Biological Symbols',
    es: 'Símbolos Biológicos'
  },
  'Conflito Emocional Subjacente': {
    'pt-BR': 'Conflito Emocional Subjacente',
    'pt-PT': 'Conflito Emocional Subjacente',
    en: 'Underlying Emotional Conflict',
    es: 'Conflicto Emocional Subyacente'
  },
  'Experiências comuns': {
    'pt-BR': 'Experiências comuns',
    'pt-PT': 'Experiências comuns',
    en: 'Common Experiences',
    es: 'Experiencias comunes'
  },
  'Padrões de comportamento': {
    'pt-BR': 'Padrões de comportamento',
    'pt-PT': 'Padrões de comportamento',
    en: 'Behavior Patterns',
    es: 'Patrones de comportamiento'
  },
  'Impacto Transgeracional': {
    'pt-BR': 'Impacto Transgeracional',
    'pt-PT': 'Impacto Transgeracional',
    en: 'Transgenerational Impact',
    es: 'Impacto Transgeneracional'
  },
  'Lateralidade': {
    'pt-BR': 'Lateralidade',
    'pt-PT': 'Lateralidade',
    en: 'Laterality',
    es: 'Lateralidad'
  },
  'Fases da doença': {
    'pt-BR': 'Fases da doença',
    'pt-PT': 'Fases da doença',
    en: 'Disease Phases',
    es: 'Fases de la enfermedad'
  },
  'Possíveis doenças correlacionadas': {
    'pt-BR': 'Possíveis doenças correlacionadas',
    'pt-PT': 'Possíveis doenças correlacionadas',
    en: 'Possible Related Conditions',
    es: 'Posibles enfermedades correlacionadas'
  },
  'Perguntas Reflexivas': {
    'pt-BR': 'Perguntas Reflexivas',
    'pt-PT': 'Perguntas Reflexivas',
    en: 'Reflective Questions',
    es: 'Preguntas Reflexivas'
  },
  'Chave Terapêutica do [RE]Sentir': {
    'pt-BR': 'Chave Terapêutica do [RE]Sentir',
    'pt-PT': 'Chave Terapêutica do [RE]Sentir',
    en: 'Therapeutic Key of [RE]Feeling',
    es: 'Clave Terapéutica del [RE]Sentir'
  }
}

// Função para traduzir título da seção
function translateSectionTitle(title: string, language: LanguageCode): string {
  return SECTION_TITLE_TRANSLATIONS[title]?.[language] || title
}

type ResultProps = {
  markdown: string
  elapsedMs: number
  userPeriod?: UserPeriod
  fullVisualization?: boolean
  onSubscribe?: () => void
  userQuestion?: string
  sessionId?: string
}

export function Result({ 
  markdown, 
  elapsedMs, 
  fullVisualization = true,
  onSubscribe = () => window.location.href = 'https://go.hotmart.com/N101121884P',
  userQuestion,
  sessionId
}: ResultProps) {
  // DEBUG: Log do markdown recebido
  const data = useMemo(() => {
    const parsed = parseResponse(markdown)
    return parsed
  }, [markdown])
  const [baseUrl, setBaseUrl] = useState('')
  const { t } = useTranslation()
  const { language } = useLanguage()
  
  // Determina se deve mostrar o conteúdo completo ou parcial
  const showFullContent = fullVisualization
  
  // Usa userQuestion se disponível, senão usa o nome popular do sintoma
  const symptomText =
    userQuestion || data.popular || data.scientific || t('result.defaultSymptom', 'Sintoma')

  useEffect(() => {
    // só roda no client
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  return (
    <Card className="w-full mb-6">
      <CardHeader className="space-y-6 p-6">
        {/* Header com botão PDF */}
        <div className="flex justify-between items-start gap-2 sm:gap-4">
          <div className="flex-1">
            {data.scientific && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className="block w-1 h-4 bg-primary rounded" />
                  <span className="uppercase text-sm font-semibold text-primary">
                    {t('result.scientificName', 'Nome científico')}
                  </span>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground mb-6">
                  {data.scientific}
                </CardTitle>
              </>
            )}
            {data.popular && (
              <div className="w-full py-4 text-center text-2xl font-bold text-primary bg-indigo-50 rounded-2xl mb-4">
                {data.popular}
              </div>
            )}
            {data.system && (
              <Badge
                variant="outline"
                className="w-fit text-primary bg-indigo-50 border-none p-2 rounded-full"
              >
                {data.system}
              </Badge>
            )}
          </div>
          
          {/* Botão de exportação PDF */}
          <div className="ml-2 sm:ml-4 flex-shrink-0">
            {/* Logs removidos em produção para evitar vazamento de conteúdo/PII */}
            <ExportPDFButton
              question={userQuestion}
              answer={markdown}
              sessionId={sessionId}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-6 pt-0">
        {/* Contexto Geral */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="block w-1 h-4 bg-primary rounded" />
            <span className="uppercase text-sm font-semibold text-primary">
              {t('result.generalContext', 'Contexto geral')}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-justify">
            {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.contextoGeral}
            </ReactMarkdown> */}
            <div dangerouslySetInnerHTML={{ __html: processMarkdownContent(data.contextoGeral) }} />
          </div>
        </section>

        {/* Impacto biológico */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="block w-1 h-4 bg-primary rounded" />
            <span className="uppercase text-sm font-semibold text-primary">
              {t('result.biologicalImpact', 'Impacto biológico')}
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-justify font-normal">
            {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.impactoBiologico}
            </ReactMarkdown> */}
            <div dangerouslySetInnerHTML={{ __html: processMarkdownContent(data.impactoBiologico) }} />
          </div>
        </section>

        {/* Accordion dinâmico com ícones */}
        <Accordion type="single" collapsible className="space-y-2 rounded-md">
          {data.others.map((sec, index) => {
            const Icon = sec.icon ? ICON_MAP[sec.icon] : null
            
            // LIBERAÇÃO: "Símbolos Biológicos" agora é acessível para todos os usuários
            const isRestrictedSection = sec.title.toLowerCase().includes('conflito emocional') ||
                                       sec.icon === 'triangle-alert' ||
                                       (index >= 2)  // Aplica restrição a partir do índice 2 (pulando Símbolos Biológicos)
            const shouldBlur = !showFullContent && isRestrictedSection

            return (
              <AccordionItem
                key={sec.title}
                value={sec.title}
                className="border rounded-md border-zinc-200"
              >
                <AccordionTrigger className="flex items-center gap-2 font-medium bg-zinc-50 rounded-md px-2 hover:no-underline">
                  <div className="flex flex-row gap-1 justify-start items-center flex-1 capitalize">
                    {Icon && (
                      <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                    )}
                    {translateSectionTitle(sec.title, language).toLowerCase()}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="prose prose-sm max-w-none p-3 text-left">
                  {shouldBlur ? (
                    <BlurredAccordionContent onSubscribe={onSubscribe}>
                      {/* <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          ul: ({ ...props }) => (
                            <ul className="list-disc list-inside ml-4" {...props} />
                          )
                        }}
                      >
                        {sec.body}
                      </ReactMarkdown> */}
                      <div dangerouslySetInnerHTML={{ __html: processMarkdownContent(sec.body) }} />
                    </BlurredAccordionContent>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: processMarkdownContent(sec.body) }} />
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {/* Ações */}
        <ClientOnly>
          <div className="w-full flex items-center justify-between gap-2">
            <SaveSymptomDialog 
              symptom={symptomText} 
              threadId={sessionId}
              triggerClassName="w-full py-6 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2"
              onSaved={() => {
                // Disparar evento customizado para atualizar a sidebar
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('foldersUpdated'))
                }
              }}
            />
            <ShareInsightDialog
              title={
                t('result.shareTitle', '{symptom} – Impacto biológico').replace(
                  '{symptom}',
                  data.popular || symptomText
                )
              }
              url={baseUrl}
              text={data.impactoBiologico}
              triggerClassName="w-full py-6 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2"
            />
          </div>
        </ClientOnly>
        {/* FOOTER */}
        <div className="mt-6 space-y-2">
          {/* Tempo de resposta */}
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>
              {t('result.responseTime', 'Tempo de resposta')}{' '}
              <strong>{(elapsedMs / 1000).toFixed(2)}s</strong>
            </span>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {t(
                'result.disclaimer',
                'O meDIZ! pode cometer erros. Sempre verifique as informações antes de tomar decisões críticas.'
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

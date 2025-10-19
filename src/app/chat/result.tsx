'use client'

import { BlurredAccordionContent } from '@/components/BlurredContent'
import { ClientOnly } from '@/components/ClientOnly'
import { ShareInsightDialog } from '@/components/Share'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import parseResponse from '@/lib/parseResponse'
import { UserPeriod } from '@/lib/userPeriod'
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  ChartLine,
  Clock,
  Dna,
  Heart,
  HeartPulse,
  Lightbulb,
  MessageCircleQuestion,
  TriangleAlert,
  Workflow
} from 'lucide-react'
import React, { useEffect, useState, useMemo } from 'react'
// import ReactMarkdown from 'react-markdown'
// import remarkGfm from 'remark-gfm'

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

type ResultProps = {
  markdown: string
  elapsedMs: number
  userPeriod?: UserPeriod
  fullVisualization?: boolean
  onSubscribe?: () => void
}

export function Result({ 
  markdown, 
  elapsedMs, 
  fullVisualization = true,
  onSubscribe = () => window.location.href = 'https://go.hotmart.com/N101121884P'
}: ResultProps) {
  const data = useMemo(() => parseResponse(markdown), [markdown])
  const [baseUrl, setBaseUrl] = useState('')
  
  // Determina se deve mostrar o conteúdo completo ou parcial
  const showFullContent = fullVisualization

  useEffect(() => {
    // só roda no client
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])

  return (
    <Card className="w-full mb-6">
      <CardHeader className="space-y-4">
        {data.scientific && (
          <>
            <div className="flex items-center gap-2">
              <span className="block w-1 h-4 bg-primary rounded" />
              <span className="uppercase text-sm font-semibold text-primary">
                Nome científico
              </span>
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {data.scientific}
            </CardTitle>
          </>
        )}
        {data.popular && (
          <div className="w-full py-4 text-center text-2xl font-bold text-primary bg-indigo-50 rounded-2xl">
            {data.popular}
          </div>
        )}
        {data.system && (
          <Badge
            variant="outline"
            className="mt-2 w-fit text-primary bg-indigo-50 border-none p-2 rounded-full"
          >
            {data.system}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contexto Geral */}
        <section className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="block w-1 h-4 bg-primary rounded" />
            <span className="uppercase text-sm font-semibold text-primary">
              Contexto Geral
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-justify">
            {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.contextoGeral}
            </ReactMarkdown> */}
            <div dangerouslySetInnerHTML={{ __html: data.contextoGeral }} />
          </div>
        </section>

        {/* Impacto biológico */}
        <section className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="block w-1 h-4 bg-primary rounded" />
            <span className="uppercase text-sm font-semibold text-primary">
              Impacto biológico
            </span>
          </div>
          <div className="prose prose-sm max-w-none text-justify font-normal">
            {/* <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.impactoBiologico}
            </ReactMarkdown> */}
            <div dangerouslySetInnerHTML={{ __html: data.impactoBiologico }} />
          </div>
        </section>

        {/* Accordion dinâmico com ícones */}
        <Accordion type="single" collapsible className="space-y-2 rounded-md">
          {data.others.map((sec, index) => {
            const Icon = sec.icon ? ICON_MAP[sec.icon] : null
            
            // Verifica se este é o acordeão "Símbolos Biológicos" ou posterior
            // e se devemos aplicar o efeito de blur
            const isRestrictedSection = sec.title.toLowerCase().includes('símbolos') || 
                                       sec.title.toLowerCase().includes('conflito emocional') ||
                                       sec.icon === 'dna' || 
                                       sec.icon === 'triangle-alert' ||
                                       index >= 1  // Aplica restrição a partir do índice 1 (Conflito Emocional Subjacente)
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
                    {sec.title.toLowerCase()}
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
                      <div dangerouslySetInnerHTML={{ __html: sec.body }} />
                    </BlurredAccordionContent>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: sec.body }} />
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {/* Ações */}
        <ClientOnly>
          <div className="w-full flex items-center justify-between gap-2">
            <Button className="w-full py-6 bg-rose-100 text-red-600 hover:bg-rose-200 transition-colors hidden">
              <Heart /> Favoritar
            </Button>
            <ShareInsightDialog
              title={`${data.popular} – Impacto biológico`}
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
              Tempo de resposta:{' '}
              <strong>{(elapsedMs / 1000).toFixed(2)}s</strong>
            </span>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              O <strong>meDIZ!</strong> pode cometer erros. Sempre verifique as
              informações antes de tomar decisões críticas.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

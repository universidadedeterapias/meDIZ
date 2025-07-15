'use client'

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
import {
  Activity,
  ArrowRightLeft,
  Brain,
  ChartLine,
  Dna,
  Heart,
  HeartPulse,
  Lightbulb,
  MessageCircleQuestion,
  TriangleAlert,
  Workflow
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

export function Result({ markdown }: { markdown: string }) {
  const data = React.useMemo(() => parseResponse(markdown), [markdown])
  const [baseUrl, setBaseUrl] = useState('')
  console.log(data)

  useEffect(() => {
    // só roda no client
    setBaseUrl(window.location.origin)
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.contextoGeral}
            </ReactMarkdown>
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.impactoBiologico}
            </ReactMarkdown>
          </div>
        </section>

        {/* Accordion dinâmico com ícones */}
        <Accordion type="single" collapsible className="space-y-2 rounded-md">
          {data.others.map(sec => {
            const Icon = sec.icon ? ICON_MAP[sec.icon] : null

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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      ul: ({ ...props }) => (
                        <ul className="list-disc list-inside ml-4" {...props} />
                      )
                    }}
                  >
                    {sec.body}
                  </ReactMarkdown>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {/* Ações */}
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
      </CardContent>
    </Card>
  )
}

'use client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import parseResponse from '@/lib/parseResponse'
import React from 'react'
import ReactMarkdown from 'react-markdown'

// interface Section {
//   title: string
//   body: string
// }
// interface Parsed {
//   scientific: string
//   popular: string
//   system: string
//   contexto: string
//   sentido: string
//   others: Section[]
// }

export function Result({ markdown }: { markdown: string }) {
  const data = React.useMemo(() => parseResponse(markdown), [markdown])
  // console.log(data)

  return (
    <Card className="w-full mb-6">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">{data.scientific}</CardTitle>
        <p className="text-sm italic text-muted-foreground">{data.popular}</p>
        <Badge variant="outline">{data.system}</Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        <section>
          <h3 className="font-semibold text-primary uppercase mb-2">
            Contexto Geral
          </h3>
          <p className="text-sm leading-relaxed">{data.contexto}</p>
        </section>

        <section>
          <h3 className="font-semibold text-primary uppercase mb-2">
            Sentido Biológico
          </h3>
          <p className="text-sm leading-relaxed">{data.sentido}</p>
        </section>

        <Accordion type="single" collapsible className="space-y-2">
          {data.others.map(sec => (
            <AccordionItem key={sec.title} value={sec.title}>
              <AccordionTrigger className="font-medium">
                {sec.title}
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm max-w-none">
                <ReactMarkdown>{sec.body}</ReactMarkdown>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}

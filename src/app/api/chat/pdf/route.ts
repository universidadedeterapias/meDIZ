import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import type PDFKit from 'pdfkit'
import { auth } from '@/auth'
import { isUserPremium } from '@/lib/premiumUtils'
import ptBR from '@/i18n/messages/pt-BR'
import ptPT from '@/i18n/messages/pt-PT'
import en from '@/i18n/messages/en'
import es from '@/i18n/messages/es'

export const runtime = 'nodejs'
export const maxDuration = 60

type LanguageCode = 'pt-BR' | 'pt-PT' | 'en' | 'es'

interface PdfRequestBody {
  question: string
  answer: string
  patientName?: string
  therapistName?: string
  language?: LanguageCode
}

type TextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'blank' }

const LANGUAGE_MAP: Record<LanguageCode, Record<string, string>> = {
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  en,
  es
}

const getLabels = (language: LanguageCode) => {
  const messages = LANGUAGE_MAP[language] || ptBR
  return {
    reportTitle: messages['pdf.title.report'] || 'Relatório de Origem Emocional',
    sectionSymptom: messages['pdf.section.symptom'] || 'Sintoma',
    sectionResponse: messages['pdf.section.response'] || 'Resposta',
    labelPatient: messages['pdf.label.patient'] || 'Paciente:',
    labelDate: messages['pdf.label.date'] || 'Data:',
    labelTime: messages['pdf.label.time'] || 'Hora:'
  }
}

const normalizeText = (text: string) =>
  text
    // Remove iframes e tags HTML antes de qualquer outro tratamento
    .replace(/<\s*iframe\b[\s\S]*?<\/\s*iframe\s*>/gi, ' ')
    .replace(/<\s*iframe\b[\s\S]*?>/gi, ' ')
    .replace(/<\/?\s*[a-z][^>]*>/gi, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?:^|\n)[^A-Za-zÀ-ÿ]*(ATENÇÃO|DICA|TIP|ATTENTION)\b/gi, '\n$1')
    .trim()

const removeMarkdownMarkers = (text: string) =>
  text.replace(/\*\*/g, '').replace(/\*/g, '').trim()

const removeEmojis = (text: string) =>
  text
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '•')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

const stripDiacritics = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const SECTION_TITLES = [
  // Português
  'Contexto geral',
  'Impacto biológico',
  'Símbolos biológicos',
  'Conflito emocional subjacente',
  'Experiências comuns',
  'Padrões de comportamento',
  'Impacto transgeracional',
  'Lateralidade',
  'Fases da doença',
  'Possíveis doenças correlacionadas',
  'Perguntas reflexivas',
  'Chave terapêutica do [re]sentir',
  // Inglês
  'General Context',
  'Biological Impact',
  'Biological Symbols',
  'Underlying Emotional Conflict',
  'Common Experiences',
  'Behavior Patterns',
  'Transgenerational Impact',
  'Laterality',
  'Disease Phases',
  'Possible Related Conditions',
  'Reflective Questions',
  '[RE]Feeling Therapeutic Key'
]

const INLINE_LABELS = [
  'DICA',
  'ATENÇÃO',
  'ATTENTION',
  'TIP'
]

const BREAK_BEFORE_LABELS = [
  'DICA',
  'ATENÇÃO',
  'ATTENTION',
  'TIP'
]

const SUBSECTION_TITLES = [
  'Fases da manifestação',
  'Fases da doença',
  'Disease Phases'
]

const injectHeadingSeparators = (text: string) => {
  let output = text
  SECTION_TITLES.forEach((title) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\s*\\*\\*?${escaped}\\*\\*?\\s*:?\\s*`, 'gi')
    output = output.replace(regex, `\n${title}\n`)
  })
  return output
}

const emphasizeInlineLabels = (text: string) => {
  let output = text
  INLINE_LABELS.forEach((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\b${escaped}\\b\\s*:?`, 'gi')
    output = output.replace(regex, (match) => `**${match.trim()}**`)
  })
  return output
}

const injectSubsectionSeparators = (text: string) => {
  let output = text
  SUBSECTION_TITLES.forEach((title) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\s*${escaped}\\s*`, 'gi')
    output = output.replace(regex, `\n${title}\n`)
  })
  return output
}

const ensureLabelBreaks = (text: string) => {
  let output = text
  output = output.replace(
    /(^|\n)\s*[^\nA-Za-zÀ-ÿ]*(?:[A-Za-z]\s*)?\*+\s*(ATENÇÃO|DICA|TIP|ATTENTION)\b/gi,
    '\n$2'
  )
  output = output.replace(
    /(^|\n)\s*[^\nA-Za-zÀ-ÿ]*(ATENÇÃO|DICA|TIP|ATTENTION)\b/gi,
    '\n$2'
  )
  BREAK_BEFORE_LABELS.forEach((label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\s*[^\\w\\s]*\\*{0,2}${escaped}\\*{0,2}\\s*!?\\s*:?\\s*`, 'gi')
    output = output.replace(regex, `\n${label}:\n`)
  })
  return output
}

const ensureSystemInfoBreaks = (text: string) => {
  let output = text
  output = output.replace(
    /\*{0,2}(Sistema\s+[^\n–—:]+)\*{0,2}\s*[-–—]\s*([^\n]+)\s*/gi,
    '$1:\n$2\n'
  )
  output = output.replace(
    /\*{0,2}(Sistema\s+[^\n–—:]+)\*{0,2}\s*:\s*([^\n]+)\s*/gi,
    '$1:\n$2\n'
  )
  output = output.replace(/\*{0,2}Nome Cient[ií]fico\*{0,2}\s*:/gi, '\nNome Científico:')
  output = output.replace(/\*{0,2}Nome Popular\*{0,2}\s*:/gi, '\nNome Popular:')
  return output
}

const ensureSideLineBreaks = (text: string) => {
  let output = text
  output = output.replace(
    /(Lado Direito:[^\n.]+\.?)\s*(Lado Esquerdo:)/gi,
    '$1\n$2'
  )
  output = output.replace(
    /(Right Side:[^\n.]+\.?)\s*(Left Side:)/gi,
    '$1\n$2'
  )
  const regex = /\b(Lado Direito|Lado Esquerdo|Right Side|Left Side)\b\s*:/gi
  output = output.replace(regex, '\n$1: ')
  return output
}

const ensurePhaseBreaks = (text: string) => {
  let output = text
  output = output.replace(/\b(Fases da manifestação|Fases da doença|Fases do processo)\b\s*/gi, '\n$1\n')
  output = output.replace(/\bFase de\b/gi, '\nFase de')
  output = output.replace(/\bCrise Epil[eé]ptica\/Epileptoide\b/gi, '\nCrise Epiléptica/Epileptoide')
  return output
}

const isSectionHeading = (line: string) => {
  const cleanLine = removeEmojis(removeMarkdownMarkers(line)).replace(/:$/, '')
  const normalizedLine = stripDiacritics(cleanLine).toLowerCase()
  return SECTION_TITLES.some((title) => {
    const normalizedTitle = stripDiacritics(title).toLowerCase()
    return normalizedLine === normalizedTitle
  })
}

const isBulletLine = (line: string) =>
  /^[-•*]\s+/.test(line) || /^(📍|🌩️|✅|⚠️|💡|❗|❕)\s+/.test(line)

const stripBullet = (line: string) => {
  const raw = line.replace(/^[-•*]\s+/, '').replace(/^(📍|🌩️|✅|⚠️|💡|❗|❕)\s+/, '').trim()
  const cleaned = removeEmojis(raw)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:stripBullet',message:'bullet normalization',data:{rawStartsWithBullet:/^•/.test(raw),cleanedStartsWithBullet:/^•/.test(cleaned)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return cleaned
}

const buildBlocks = (text: string): TextBlock[] => {
  const normalized = normalizeText(
    ensureSideLineBreaks(
      ensureLabelBreaks(
        emphasizeInlineLabels(
          ensureSystemInfoBreaks(
            ensurePhaseBreaks(
              injectSubsectionSeparators(
                injectHeadingSeparators(text)
              )
            )
          )
        )
      )
    )
  )
  const normalizedHasIframe = /<\s*iframe\b/i.test(normalized)
  const normalizedHasHtmlTag = /<\s*[a-z][\s\S]*>/i.test(normalized)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:buildBlocks',message:'normalized inspection',data:{normalizedLength:normalized.length,normalizedHasIframe,normalizedHasHtmlTag},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  console.log('[PDF] normalized inspection', {
    normalizedLength: normalized.length,
    normalizedHasIframe,
    normalizedHasHtmlTag
  })
  // #endregion
  if (!normalized) return []
  const lines = normalized.split('\n')
  const blocks: TextBlock[] = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
      paragraphLines = []
    }
  }

  for (const rawLine of lines) {
    const line = removeEmojis(rawLine).trim()
    if (!line) {
      flushParagraph()
      blocks.push({ type: 'blank' })
      continue
    }

    if (/^(Lado Direito|Lado Esquerdo|Right Side|Left Side)\s*:/i.test(line)) {
      flushParagraph()
      blocks.push({ type: 'paragraph', text: line })
      continue
    }

    if (isSectionHeading(line)) {
      flushParagraph()
      blocks.push({ type: 'heading', text: removeEmojis(removeMarkdownMarkers(line)).replace(/:$/, '') })
      continue
    }

    if (isBulletLine(line)) {
      flushParagraph()
      blocks.push({ type: 'bullet', text: stripBullet(line) })
      continue
    }

    const lastBlock = blocks[blocks.length - 1]
    const startsWithUppercase = /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(line)
    if (lastBlock?.type === 'bullet' && !startsWithUppercase) {
      lastBlock.text = `${lastBlock.text} ${line}`
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  return blocks
}

const formatDate = (date: Date, language: LanguageCode) =>
  date.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

const formatTime = (date: Date, language: LanguageCode) =>
  date.toLocaleTimeString(language === 'en' ? 'en-US' : 'pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })

const DEFAULT_LINE_GAP = 6
const BULLET_LINE_GAP = 5

const writeInlineText = (doc: PDFKit.PDFDocument, text: string, lineGap = DEFAULT_LINE_GAP) => {
  const normalized = text.replace(/•/g, '**•**')
  const segments = normalized.split('**')
  segments.forEach((segment, index) => {
    const isBold = index % 2 === 1
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
    doc.text(segment, { continued: index < segments.length - 1, lineGap })
  })
  doc.text('', { lineGap })
}

export async function POST(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const isPremium = await isUserPremium(session.user.id)
  if (!isPremium) {
    return NextResponse.json({ error: 'Função disponível apenas para assinantes' }, { status: 403 })
  }

  const body = (await req.json()) as PdfRequestBody
  const question = body.question?.trim()
  const answer = body.answer?.trim()

  if (!question || !answer) {
    return NextResponse.json({ error: 'Dados insuficientes para gerar PDF' }, { status: 400 })
  }

  const language: LanguageCode = body.language || 'pt-BR'
  const labels = getLabels(language)
  const now = new Date()
  const patientName = body.patientName?.trim()
  const therapistName = body.therapistName?.trim() || session.user.name || session.user.email || 'meDIZ'
  const iframeMatches = answer?.match(/<\s*iframe\b/gi) || []
  const hasIframe = iframeMatches.length > 0
  const hasHtmlTag = /<\s*[a-z][\s\S]*>/i.test(answer || '')
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'PDF input inspection',data:{answerLength:answer?.length||0,hasIframe,iframeCount:iframeMatches.length,hasHtmlTag,language},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  console.log('[PDF] Input inspection', { answerLength: answer?.length || 0, hasIframe, iframeCount: iframeMatches.length, hasHtmlTag, language })

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const chunks: Buffer[] = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (error) => reject(error))
  })

  doc.font('Helvetica-Bold').fontSize(18).text(therapistName)
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(12).text(labels.reportTitle)
  doc.moveDown(0.6)
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#E5E7EB').stroke()
  doc.moveDown(0.8)

  if (patientName) {
    doc.font('Helvetica-Bold').fontSize(11).text(labels.labelPatient, { continued: true })
    doc.font('Helvetica').text(` ${patientName}`)
    doc.moveDown(0.4)
  }

  doc.font('Helvetica-Bold').fontSize(10).text(labels.labelDate, { continued: true })
  doc.font('Helvetica').text(` ${formatDate(now, language)}`)
  doc.font('Helvetica-Bold').text(labels.labelTime, { continued: true })
  doc.font('Helvetica').text(` ${formatTime(now, language)}`)
  doc.moveDown(0.8)

  doc.font('Helvetica-Bold').fontSize(12).text(labels.sectionSymptom)
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(11).text(question, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right })
  doc.moveDown(0.8)

  doc.font('Helvetica-Bold').fontSize(12).text(labels.sectionResponse)
  doc.moveDown(0.4)

  const blocks = buildBlocks(answer)
  const blocksContainIframe = blocks.some((block) => 'text' in block && /<\s*iframe\b/i.test(block.text))
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:blocks',message:'blocks inspection',data:{blocksCount:blocks.length,blocksContainIframe},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  console.log('[PDF] blocks inspection', {
    blocksCount: blocks.length,
    blocksContainIframe
  })
  // #endregion
  doc.font('Helvetica').fontSize(11)

  blocks.forEach((block) => {
    if (block.type === 'blank') {
      doc.moveDown(0.5)
      return
    }

    if (block.type === 'heading') {
      doc.moveDown(0.4)
      doc.font('Helvetica-Bold').fontSize(11).text(block.text.toUpperCase())
      doc.moveDown(0.5)
      doc.font('Helvetica').fontSize(11)
      return
    }

    if (block.type === 'bullet') {
      doc.font('Helvetica')
      writeInlineText(doc, `• ${block.text}`, BULLET_LINE_GAP)
      doc.moveDown(1)
      return
    }

    writeInlineText(doc, block.text, DEFAULT_LINE_GAP)
    doc.moveDown(1.1)
  })

  doc.end()

  const pdfBuffer = await pdfBufferPromise
  const filename = `relatorio-mediz-${now.toISOString().split('T')[0]}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

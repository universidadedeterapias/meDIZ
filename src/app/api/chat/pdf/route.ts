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
export const maxDuration = 300 // 5 minutos - geração de PDF pode ser lenta

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

const normalizeText = (text: string) => {
  // #region agent log
  const originalLength = text?.length || 0
  const _originalPreview = text?.substring(0, 200) || 'EMPTY'
  // #endregion
  
  const normalized = text
    // Remove iframes e converte tags estruturais em quebras antes de limpar HTML
    .replace(/<\s*iframe\b[\s\S]*?<\/\s*iframe\s*>/gi, ' ')
    .replace(/<\s*iframe\b[\s\S]*?>/gi, ' ')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\s*li\s*>/gi, '\n- ')
    .replace(/<\/\s*li\s*>/gi, '')
    .replace(/<\/\s*ul\s*>/gi, '\n')
    .replace(/<\/\s*ol\s*>/gi, '\n')
    .replace(/<\/?\s*[a-z][^>]*>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(?:^|\n)[^A-Za-zÀ-ÿ]*(ATENÇÃO|DICA|TIP|ATTENTION)\b/gi, '\n$1')
    .trim()
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:normalizeText',message:'normalizeText result',data:{originalLength,normalizedLength:normalized?.length||0,normalizedPreview:normalized?.substring(0,200)||'EMPTY',isEmpty:!normalized||normalized.length===0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  return normalized
}

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
  return removeEmojis(raw)
}

const buildBlocks = (text: string): TextBlock[] => {
  // #region agent log
  const inputLength = text?.length || 0
  const _inputPreview = text?.substring(0, 200) || 'EMPTY'
  // #endregion
  
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
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:buildBlocks',message:'after normalizeText',data:{inputLength,normalizedLength:normalized?.length||0,normalizedPreview:normalized?.substring(0,200)||'EMPTY',willReturnEmpty:!normalized||normalized.length===0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  if (!normalized) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:buildBlocks',message:'returning empty blocks',data:{reason:'normalized is empty'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return []
  }
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
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:buildBlocks',message:'blocks built',data:{blocksCount:blocks.length,headingCount:blocks.filter(b=>b.type==='heading').length,paragraphCount:blocks.filter(b=>b.type==='paragraph').length,bulletCount:blocks.filter(b=>b.type==='bullet').length,blankCount:blocks.filter(b=>b.type==='blank').length,firstBlockType:blocks[0]?.type||'none',firstBlockText:blocks[0]&&'text' in blocks[0]?blocks[0].text.substring(0,100):'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
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
  // Remove markdown markers vazios e normaliza
  const cleaned = text.trim()
  
  // Se o texto está vazio ou contém apenas marcadores markdown, retorna
  if (!cleaned || cleaned.replace(/\*\*/g, '').replace(/\*/g, '').trim().length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:writeInlineText',message:'skipping empty text',data:{originalText:cleaned.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
    return
  }
  
  // Normaliza bullets
  const normalized = cleaned.replace(/•/g, '**•**')
  
  // Divide por ** para processar negrito
  const segments = normalized.split('**')
  
  // Filtra segmentos vazios e processa
  const validSegments = segments.filter(s => s.trim().length > 0)
  
  if (validSegments.length === 0) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:writeInlineText',message:'no valid segments',data:{originalText:cleaned.substring(0,50),segmentsCount:segments.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
    return
  }
  
  // #region agent log
  const beforeX = doc.x
  const beforeY = doc.y
  // #endregion
  
  validSegments.forEach((segment, index) => {
    const isBold = index % 2 === 1
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
    doc.fillColor('black') // Garante que a cor está sempre preta
    const isLast = index === validSegments.length - 1
    const segmentText = segment.trim()
    // #region agent log
    if (index < 2 || index === validSegments.length - 1) {
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:writeInlineText',message:'writing segment',data:{segmentIndex:index,segmentText:segmentText.substring(0,50),isBold,isLast,validSegmentsCount:validSegments.length,x:doc.x,y:doc.y},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H8'})}).catch(()=>{});
    }
    // #endregion
    if (segmentText.length > 0) {
      doc.text(segmentText, { continued: !isLast, lineGap })
    }
  })
  doc.text('', { lineGap })
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:writeInlineText',message:'text written',data:{beforeX,beforeY,afterX:doc.x,afterY:doc.y,validSegmentsCount:validSegments.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H8'})}).catch(()=>{});
  // #endregion
}

export async function POST(req: NextRequest) {
  const session = await auth()
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'entry',data:{hasSession:!!session?.user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'payload snapshot',data:{questionLength:question?.length||0,answerLength:answer?.length||0,answerPreview:answer?.substring(0,200)||'EMPTY',language:body.language||'pt-BR',hasHtml:/<\s*[a-z][\s\S]*>/i.test(answer||''),hasIframe:/<iframe/i.test(answer||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (!question || !answer) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'missing data error',data:{hasQuestion:!!question,hasAnswer:!!answer},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return NextResponse.json({ error: 'Dados insuficientes para gerar PDF' }, { status: 400 })
  }

  const language: LanguageCode = body.language || 'pt-BR'
  const labels = getLabels(language)
  const now = new Date()
  const patientName = body.patientName?.trim()
  const therapistName = body.therapistName?.trim() || session.user.name || session.user.email || 'meDIZ'
  // Logs removidos para produção

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const chunks: Buffer[] = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', (error) => reject(error))
  })

  // Garante que a cor do texto está definida como preto
  doc.fillColor('black')
  doc.strokeColor('black')

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'doc initialized',data:{pageWidth:doc.page.width,pageHeight:doc.page.height,marginLeft:doc.page.margins.left,marginRight:doc.page.margins.right,marginTop:doc.page.margins.top,marginBottom:doc.page.margins.bottom,initialX:doc.x,initialY:doc.y},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H7'})}).catch(()=>{});
  // #endregion

  // Escreve o header e garante que está visível
  doc.font('Helvetica-Bold').fontSize(18).fillColor('black').text(therapistName)
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(12).fillColor('black').text(labels.reportTitle)
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'header written',data:{x:doc.x,y:doc.y,therapistNameLength:therapistName.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H7'})}).catch(()=>{});
  // #endregion
  doc.moveDown(0.6)
  doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).strokeColor('#E5E7EB').stroke()
  doc.moveDown(0.8)

  if (patientName) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('black').text(labels.labelPatient, { continued: true })
    doc.font('Helvetica').fillColor('black').text(` ${patientName}`)
    doc.moveDown(0.4)
  }

  doc.font('Helvetica-Bold').fontSize(10).fillColor('black').text(labels.labelDate, { continued: true })
  doc.font('Helvetica').fillColor('black').text(` ${formatDate(now, language)}`)
  doc.font('Helvetica-Bold').fillColor('black').text(labels.labelTime, { continued: true })
  doc.font('Helvetica').fillColor('black').text(` ${formatTime(now, language)}`)
  doc.moveDown(0.8)

  doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text(labels.sectionSymptom)
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(11).fillColor('black').text(question, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right })
  doc.moveDown(0.8)

  doc.font('Helvetica-Bold').fontSize(12).fillColor('black').text(labels.sectionResponse)
  doc.moveDown(0.4)

  const blocks = buildBlocks(answer)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'blocks built',data:{blocksCount:blocks.length,hasHeading:blocks.some(b=>b.type==='heading'),hasBullet:blocks.some(b=>b.type==='bullet')},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  // #region agent log
  const textBlocks = blocks.filter((block) => 'text' in block) as Array<{ text: string }>
  const totalTextLength = textBlocks.reduce((sum, block) => sum + block.text.length, 0)
  const firstText = textBlocks[0]?.text?.slice(0, 160) || ''
  const lastText = textBlocks[textBlocks.length - 1]?.text?.slice(0, 160) || ''
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'blocks text summary',data:{textBlocksCount:textBlocks.length,totalTextLength,firstText,firstTextLength:firstText.length,lastTextLength:lastText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  // Logs removidos para produção
  doc.font('Helvetica').fontSize(11).fillColor('black')

  let blocksWritten = 0
  blocks.forEach((block, index) => {
    // #region agent log
    if (index < 5 || block.type !== 'blank') {
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'writing block',data:{blockIndex:index,blockType:block.type,blockText:block.type!=='blank'&&'text' in block?block.text.substring(0,100):'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
    }
    // #endregion
    
    if (block.type === 'blank') {
      doc.moveDown(0.5)
      return
    }

    if (block.type === 'heading') {
      doc.moveDown(0.4)
      // Remove markdown do título antes de escrever
      const cleanTitle = block.text.replace(/\*\*/g, '').replace(/\*/g, '').trim()
      if (cleanTitle) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('black').text(cleanTitle.toUpperCase())
        doc.moveDown(0.5)
        doc.font('Helvetica').fontSize(11).fillColor('black')
        blocksWritten++
      }
      return
    }

    if (block.type === 'bullet') {
      const bulletText = block.text.trim()
      if (bulletText && bulletText.replace(/\*\*/g, '').replace(/\*/g, '').trim().length > 0) {
        doc.font('Helvetica').fillColor('black')
        writeInlineText(doc, `• ${bulletText}`, BULLET_LINE_GAP)
        doc.moveDown(1)
        blocksWritten++
      }
      return
    }

    const paragraphText = block.text.trim()
    const cleanedParagraph = paragraphText.replace(/\*\*/g, '').replace(/\*/g, '').trim()
    // #region agent log
    if (!cleanedParagraph || cleanedParagraph.length === 0) {
      fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'skipping empty paragraph',data:{blockIndex:index,originalText:paragraphText.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'H6'})}).catch(()=>{});
    }
    // #endregion
    if (paragraphText && cleanedParagraph.length > 0) {
      writeInlineText(doc, paragraphText, DEFAULT_LINE_GAP)
      doc.moveDown(1.1)
      blocksWritten++
    }
  })
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'all blocks written',data:{totalBlocks:blocks.length,blocksWritten},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  doc.end()

  const pdfBuffer = await pdfBufferPromise
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/d7dd85d6-4ae9-4d7a-bb81-6fa13e0d3054',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/chat/pdf:POST',message:'pdf ready',data:{pdfBytes:pdfBuffer.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  const filename = `relatorio-mediz-${now.toISOString().split('T')[0]}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}

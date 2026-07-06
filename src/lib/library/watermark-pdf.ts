import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

export type WatermarkUserInfo = {
  fullName: string
  email: string
  cpf: string
}

const WATERMARK_OPACITY = 0.13
const FOOTER_SIZE = 7
const DIAGONAL_SIZE = 22

function formatTimestamp(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date())
}

function footerLine(user: WatermarkUserInfo): string {
  const when = formatTimestamp()
  return `Cópia licenciada para ${user.fullName} (${user.email}) em ${when} — Uso pessoal e intransferível. Distribuição não autorizada sujeita às sanções da Lei 9.610/98 (Direitos Autorais). © Universidade de Terapias`
}

function diagonalLine(user: WatermarkUserInfo): string {
  return `${user.fullName} • ${user.email} • ${user.cpf}`
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

async function drawLicensePage(
  pdfDoc: PDFDocument,
  user: WatermarkUserInfo,
  documentTitle: string
): Promise<void> {
  const page = pdfDoc.insertPage(0, [595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()
  let y = height - 72

  page.drawText('TERMO DE LICENÇA DE USO — CÓPIA DIGITAL', {
    x: 48,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.15, 0.15, 0.15)
  })
  y -= 28

  page.drawText(`Documento: ${documentTitle}`, {
    x: 48,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2)
  })
  y -= 20

  const licenseParagraphs = [
    `Licenciado: ${user.fullName}`,
    `E-mail: ${user.email}`,
    `CPF: ${user.cpf}`,
    `Data de emissão: ${formatTimestamp()}`,
    '',
    'Este arquivo PDF é uma cópia digital personalizada e licenciada exclusivamente para o titular acima.',
    'É permitido o uso pessoal e intransferível. É vedada a reprodução, distribuição, compartilhamento',
    'ou publicação, total ou parcial, sem autorização expressa.',
    '',
    'A violação dos direitos autorais está sujeita às sanções da Lei nº 9.610/1998 (Direitos Autorais).',
    '© Universidade de Terapias — Todos os direitos reservados.'
  ]

  for (const paragraph of licenseParagraphs) {
    if (!paragraph) {
      y -= 10
      continue
    }
    const lines = wrapText(paragraph, 92)
    for (const line of lines) {
      page.drawText(line, {
        x: 48,
        y,
        size: 10,
        font,
        color: rgb(0.25, 0.25, 0.25),
        maxWidth: 500
      })
      y -= 14
    }
  }
}

function stampPage(
  page: ReturnType<PDFDocument['getPages']>[number],
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  user: WatermarkUserInfo
): void {
  const { width, height } = page.getSize()
  const diagonal = diagonalLine(user)
  const footer = footerLine(user)

  page.drawText(diagonal, {
    x: width * 0.08,
    y: height * 0.48,
    size: DIAGONAL_SIZE,
    font,
    color: rgb(0.45, 0.45, 0.45),
    opacity: WATERMARK_OPACITY,
    rotate: degrees(-35)
  })

  page.drawText(diagonal, {
    x: width * 0.35,
    y: height * 0.22,
    size: DIAGONAL_SIZE * 0.85,
    font,
    color: rgb(0.45, 0.45, 0.45),
    opacity: WATERMARK_OPACITY * 0.9,
    rotate: degrees(-35)
  })

  const footerLines = wrapText(footer, 118)
  let footerY = 18
  for (let i = footerLines.length - 1; i >= 0; i--) {
    page.drawText(footerLines[i], {
      x: 36,
      y: footerY,
      size: FOOTER_SIZE,
      font,
      color: rgb(0.35, 0.35, 0.35)
    })
    footerY += FOOTER_SIZE + 2
  }
}

/**
 * Aplica marca d'água embutida no conteúdo (não anotação removível) + página de licença.
 */
export async function applyPdfWatermark(
  originalBytes: Uint8Array,
  user: WatermarkUserInfo,
  documentTitle: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  await drawLicensePage(pdfDoc, user, documentTitle)

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  for (const page of pdfDoc.getPages()) {
    stampPage(page, font, user)
  }

  return pdfDoc.save({ useObjectStreams: false })
}

export function formatCpfForDisplay(cpf: string | null | undefined): string {
  const digits = (cpf ?? '').replace(/\D/g, '')
  if (digits.length !== 11) return 'CPF não cadastrado'
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function resolveDisplayName(
  fullName: string | null | undefined,
  name: string | null | undefined,
  email: string
): string {
  const candidate = fullName?.trim() || name?.trim()
  return candidate || email.split('@')[0] || 'Usuário'
}

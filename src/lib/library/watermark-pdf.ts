import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  StandardFonts,
  rgb,
  degrees
} from 'pdf-lib'

export type WatermarkUserInfo = {
  fullName: string
  email: string
  cpf: string
}

const WATERMARK_OPACITY = 0.13
const FOOTER_SIZE = 7
const DIAGONAL_SIZE = 22

/** Faixa 0x80-0x9F do CP1252, que não existe no Latin-1. */
const WINANSI_EXTRAS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'

/**
 * Letras latinas que o NFD não decompõe (o traço/ponto faz parte do glifo),
 * então sem isto sumiriam do nome — "Łukasz" viraria "ukasz".
 */
const LATIN_FALLBACKS: Record<string, string> = {
  Ł: 'L',
  ł: 'l',
  Đ: 'D',
  đ: 'd',
  Ħ: 'H',
  ħ: 'h',
  Ŧ: 'T',
  ŧ: 't',
  ı: 'i',
  İ: 'I',
  ĸ: 'k',
  Ŀ: 'L',
  ŀ: 'l',
  ſ: 's',
  Ə: 'E',
  ə: 'e',
  Œ: 'OE',
  œ: 'oe'
}

function isWinAnsiEncodable(char: string): boolean {
  const cp = char.codePointAt(0) ?? 0
  if (cp >= 0x20 && cp <= 0x7e) return true
  if (cp >= 0xa0 && cp <= 0xff) return true
  return WINANSI_EXTRAS.includes(char)
}

/**
 * `StandardFonts.Helvetica` só codifica WinAnsi (CP1252) e o pdf-lib joga
 * exceção em qualquer caractere fora dela — o que virava 500 no download.
 * Pega tanto texto decomposto (NFD: "o" + U+0301, visualmente igual a "ó")
 * quanto alfabetos não latinos vindos de nome/e-mail de cliente estrangeiro.
 *
 * Estratégia: compõe em NFC (resolve o caso comum sem perder acento), depois
 * remove o diacrítico do que sobrar (Č -> C) e, por fim, descarta o que ainda
 * não couber. Degradar o texto é preferível a não entregar o arquivo.
 */
export function toWinAnsiSafe(text: string): string {
  let out = ''
  for (const char of text.normalize('NFC')) {
    if (isWinAnsiEncodable(char)) {
      out += char
      continue
    }
    const mapped = LATIN_FALLBACKS[char]
    if (mapped) {
      out += mapped
      continue
    }
    const stripped = char.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    for (const fallback of stripped) {
      if (isWinAnsiEncodable(fallback)) out += fallback
    }
  }
  return out
}

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

/** Todo perfil ICC comeca com um cabecalho fixo de 128 bytes. */
const ICC_HEADER_BYTES = 128

const DEVICE_SPACE_BY_COMPONENTS: Record<number, string> = {
  1: 'DeviceGray',
  3: 'DeviceRGB',
  4: 'DeviceCMYK'
}

/**
 * Espaco de cor que substitui um `[/ICCBased <perfil>]` cujo perfil nao existe,
 * ou null se o perfil e valido.
 */
function replacementForBrokenIcc(pdfDoc: PDFDocument, value: PDFObject): PDFName | null {
  const array = pdfDoc.context.lookup(value)
  if (!(array instanceof PDFArray) || array.size() !== 2) return null
  if (pdfDoc.context.lookup(array.get(0)) !== PDFName.of('ICCBased')) return null

  const profile = pdfDoc.context.lookup(array.get(1))
  if (!(profile instanceof PDFRawStream)) return null
  const length = profile.contents.length
  const compressed = profile.dict.has(PDFName.of('Filter'))
  if (length > 0 && (compressed || length >= ICC_HEADER_BYTES)) return null

  const alternate = pdfDoc.context.lookup(profile.dict.get(PDFName.of('Alternate')))
  if (alternate instanceof PDFName) return alternate
  const components = pdfDoc.context.lookup(profile.dict.get(PDFName.of('N')))
  const device =
    components instanceof PDFNumber ? DEVICE_SPACE_BY_COMPONENTS[components.asNumber()] : undefined
  return PDFName.of(device ?? 'DeviceRGB')
}

/**
 * Troca perfis ICC vazios pelo espaco de cor de dispositivo equivalente.
 *
 * A otimizacao pelo Ghostscript (publicar-pdfs-otimizados.ts) juntou os 178
 * perfis ICC v4 do "O CORPO DIZ" num so e o gravou com 0 bytes. Ghostscript e
 * MuPDF ignoram o perfil quebrado e desenham em RGB, entao a conferencia visual
 * passou; os leitores de PDF do celular descartam a imagem inteira — 175 das
 * ilustracoes sumiam. Sem perfil, `N` diz quantos componentes a imagem tem, que
 * e exatamente o que o espaco de dispositivo precisa.
 *
 * Corrige na geracao, e nao so na origem, para que nenhum PDF ja publicado
 * (ou publicado no futuro com o mesmo defeito) chegue quebrado ao cliente.
 */
export function repairEmptyIccProfiles(pdfDoc: PDFDocument): number {
  let repaired = 0

  const visit = (container: PDFDict | PDFArray): void => {
    const entries: [PDFName | number, PDFObject][] =
      container instanceof PDFDict
        ? container.entries()
        : container.asArray().map((value, index) => [index, value])

    for (const [key, value] of entries) {
      // Referencias ficam para o laco de baixo, que trata cada objeto indireto.
      if (value instanceof PDFRef) continue
      const replacement = replacementForBrokenIcc(pdfDoc, value)
      if (replacement) {
        if (container instanceof PDFDict) container.set(key as PDFName, replacement)
        else container.set(key as number, replacement)
        repaired++
      } else if (value instanceof PDFDict || value instanceof PDFArray) {
        visit(value)
      }
    }
  }

  for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
    // Espaco de cor declarado como objeto proprio: troca o objeto, e todo mundo
    // que aponta para ele passa a ver o espaco de dispositivo.
    const replacement = replacementForBrokenIcc(pdfDoc, object)
    if (replacement) {
      pdfDoc.context.assign(ref, replacement)
      repaired++
    } else if (object instanceof PDFRawStream) {
      visit(object.dict)
    } else if (object instanceof PDFDict || object instanceof PDFArray) {
      visit(object)
    }
  }

  return repaired
}

/**
 * Aplica marca d'água embutida no conteúdo (não anotação removível) + página de licença.
 */
export async function applyPdfWatermark(
  originalBytes: Uint8Array,
  user: WatermarkUserInfo,
  documentTitle: string
): Promise<Uint8Array> {
  // Sanitiza uma vez, na fronteira: tudo abaixo daqui vai para drawText.
  const safeName = toWinAnsiSafe(user.fullName).trim()
  const safeUser: WatermarkUserInfo = {
    fullName: safeName || toWinAnsiSafe(user.email),
    email: toWinAnsiSafe(user.email),
    cpf: toWinAnsiSafe(user.cpf)
  }
  const safeTitle = toWinAnsiSafe(documentTitle)

  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  repairEmptyIccProfiles(pdfDoc)
  await drawLicensePage(pdfDoc, safeUser, safeTitle)

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  for (const page of pdfDoc.getPages()) {
    stampPage(page, font, safeUser)
  }

  // Object streams evitam inflar ainda mais PDFs grandes durante a serializacao.
  return pdfDoc.save({ useObjectStreams: true, objectsPerTick: 50 })
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

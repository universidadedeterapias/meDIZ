import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { LanguageCode } from '@/i18n/config'

interface PDFData {
  question: string
  answer: string
  timestamp: Date
  sessionId?: string
  patientName?: string
  therapistName?: string
  language?: LanguageCode
}

/**
 * Encontra posições dos títulos de seção para evitar cortá-los
 * Retorna array de posições Y (em pixels) dos títulos
 */
function findSectionTitles(element: HTMLElement): number[] {
  const titles: number[] = []
  
  // Apenas títulos de seção (os mais importantes para não cortar)
  const titleElements = element.querySelectorAll<HTMLElement>('.content-section-title')
  
  titleElements.forEach(el => {
    const rect = el.getBoundingClientRect()
    const containerRect = element.getBoundingClientRect()
    const top = Math.max(0, rect.top - containerRect.top + element.scrollTop)
    
    if (top > 0) {
      titles.push(top)
    }
  })
  
  return titles.sort((a, b) => a - b)
}

/**
 * Encontra posições de parágrafos e elementos de texto para evitar cortá-los
 * Retorna array de objetos com top e bottom de cada elemento
 */
function findTextElements(element: HTMLElement): Array<{ top: number; bottom: number }> {
  const textElements: Array<{ top: number; bottom: number }> = []
  
  // Encontra parágrafos e itens de lista
  const selectors = [
    '.content-section-body > p',
    '.content-section-body > li',
    '.content-section-body > ul',
    '.content-section-body > ol'
  ]
  
  selectors.forEach(selector => {
    const elements = element.querySelectorAll<HTMLElement>(selector)
    elements.forEach(el => {
      const rect = el.getBoundingClientRect()
      const containerRect = element.getBoundingClientRect()
      const top = Math.max(0, rect.top - containerRect.top + element.scrollTop)
      const bottom = top + rect.height
      
      if (top > 0 && rect.height > 0) {
        textElements.push({ top, bottom })
      }
    })
  })
  
  return textElements.sort((a, b) => a.top - b.top)
}

/**
 * Gera PDF com o conteúdo da consulta do chat
 */
export async function generateChatPDF(data: PDFData): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('generateChatPDF deve ser executado no cliente (browser)')
  }

  if (!data.answer || data.answer.trim().length === 0) {
    throw new Error('Answer está vazio - não é possível gerar PDF sem conteúdo')
  }

  // #region agent log
  // Verifica se há iframes no conteúdo original ANTES de qualquer processamento
  const iframeInOriginalAnswer = /<iframe/i.test(data.answer)
  const embedInOriginalAnswer = /<embed/i.test(data.answer)
  if (iframeInOriginalAnswer || embedInOriginalAnswer) {
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:78',message:'IFRAME IN ORIGINAL ANSWER',data:{iframeInOriginalAnswer,embedInOriginalAnswer,answerLength:data.answer.length,answerEnd:data.answer.substring(Math.max(0,data.answer.length-1000))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
  }
  // #endregion

  const language = data.language || 'pt-BR'
  let htmlContent = createPDFHTML(data, language)

  // #region agent log
  // Verifica se há iframes no HTML final antes de inserir no DOM
  const iframeInFinalHTML = /<iframe/i.test(htmlContent)
  const embedInFinalHTML = /<embed/i.test(htmlContent)
  if (iframeInFinalHTML || embedInFinalHTML) {
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:88',message:'IFRAME IN FINAL HTML - SANITIZING',data:{iframeInFinalHTML,embedInFinalHTML,htmlContentLength:htmlContent.length,htmlContentEnd:htmlContent.substring(Math.max(0,htmlContent.length-1000))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
    
    // Sanitização adicional de emergência
    htmlContent = htmlContent
      .replace(/<iframe\b[^>]*\/?>/gi, '')
      .replace(/<\/iframe\s*>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<embed\b[^>]*\/?>/gi, '')
      .replace(/<\/embed\s*>/gi, '')
      .replace(/&lt;iframe[^&]*&gt;/gi, '')
      .replace(/&lt;\/iframe&gt;/gi, '')
  }
  // #endregion

  // Cria elemento temporário FORA da viewport mas visível para html2canvas
  const tempDiv = document.createElement('div')
  tempDiv.setAttribute('data-pdf-temp', 'true')
  tempDiv.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 210mm;
    min-height: 100vh;
    padding: 20px;
    background-color: #ffffff;
    color: #1f2937;
    opacity: 1;
    visibility: visible;
    display: block;
    z-index: 1;
  `
  tempDiv.innerHTML = htmlContent
  document.body.appendChild(tempDiv)

  // #region agent log
  // Verifica se há iframes no DOM após inserção (pode ser inserido dinamicamente)
  const iframesInDOM = tempDiv.querySelectorAll('iframe')
  const embedsInDOM = tempDiv.querySelectorAll('embed')
  const iframeTextInDOM = tempDiv.innerHTML.includes('<iframe') || tempDiv.innerHTML.includes('iframe')
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:102',message:'DOM check after HTML insertion',data:{iframesInDOMCount:iframesInDOM.length,embedsInDOMCount:embedsInDOM.length,iframeTextInDOM,htmlContentLength:htmlContent.length,htmlContentPreview:htmlContent.substring(Math.max(0,htmlContent.length-500))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
  // #endregion

  // Remove iframes do DOM se encontrados (defesa adicional)
  iframesInDOM.forEach(iframe => {
    iframe.remove()
  })
  embedsInDOM.forEach(embed => {
    embed.remove()
  })

  // Aguarda renderização completa
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => setTimeout(resolve, 300))

  // #region agent log
  // Verifica novamente após renderização (pode ter sido inserido dinamicamente)
  const iframesAfterRender = tempDiv.querySelectorAll('iframe')
  const embedsAfterRender = tempDiv.querySelectorAll('embed')
  // Verifica também no DOM global (pode estar fora do tempDiv)
  const allIframesInDocument = document.querySelectorAll('iframe')
  const allEmbedsInDocument = document.querySelectorAll('embed')
  if (iframesAfterRender.length > 0 || embedsAfterRender.length > 0 || allIframesInDocument.length > 0 || allEmbedsInDocument.length > 0) {
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:120',message:'IFRAMES FOUND AFTER RENDER',data:{iframesAfterRenderCount:iframesAfterRender.length,embedsAfterRenderCount:embedsAfterRender.length,allIframesInDocumentCount:allIframesInDocument.length,allEmbedsInDocumentCount:allEmbedsInDocument.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
    // Remove novamente
    iframesAfterRender.forEach(iframe => iframe.remove())
    embedsAfterRender.forEach(embed => embed.remove())
  }
  // #endregion

  // Verifica se há conteúdo
  const hasContent = tempDiv.textContent && tempDiv.textContent.trim().length > 0
  if (!hasContent) {
    document.body.removeChild(tempDiv)
    throw new Error('Conteúdo não encontrado no HTML gerado')
  }

  try {
    // Verificação final antes de capturar: remove qualquer iframe que possa ter sido inserido
    const finalIframesCheck = tempDiv.querySelectorAll('iframe')
    const finalEmbedsCheck = tempDiv.querySelectorAll('embed')
    finalIframesCheck.forEach(iframe => iframe.remove())
    finalEmbedsCheck.forEach(embed => embed.remove())
    
    // #region agent log
    // Verifica também se há texto de iframe no innerHTML antes de capturar
    const iframeTextBeforeCapture = tempDiv.innerHTML.includes('<iframe') || tempDiv.innerHTML.includes('iframe')
    if (finalIframesCheck.length > 0 || finalEmbedsCheck.length > 0 || iframeTextBeforeCapture) {
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:167',message:'IFRAMES BEFORE CAPTURE',data:{finalIframesCheckCount:finalIframesCheck.length,finalEmbedsCheckCount:finalEmbedsCheck.length,iframeTextBeforeCapture,innerHTMLPreview:tempDiv.innerHTML.substring(Math.max(0,tempDiv.innerHTML.length-1000))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    }
    // #endregion
    
    // Encontra posições dos títulos de seção antes de capturar
    const sectionTitles = findSectionTitles(tempDiv)
    
    // Encontra elementos de texto para verificar cortes
    const textElements = findTextElements(tempDiv)
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:180',message:'DOM analysis complete',data:{titlesCount:sectionTitles.length,textElementsCount:textElements.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // Usa html2canvas com escala maior e configurações otimizadas
    // IMPORTANTE: ignora elementos fora do elemento para evitar capturar iframes do DOM global
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      ignoreElements: (element) => {
        // Ignora qualquer iframe, embed ou object, mesmo que esteja dentro do tempDiv
        return element.tagName === 'IFRAME' || 
               element.tagName === 'EMBED' || 
               element.tagName === 'OBJECT' ||
               (element.closest && element.closest('iframe, embed, object') !== null)
      }
    })

    // #region agent log
    // Verifica se há iframes no DOM global após a captura (pode ter sido capturado pelo html2canvas)
    const allIframesAfterCapture = document.querySelectorAll('iframe')
    const allEmbedsAfterCapture = document.querySelectorAll('embed')
    const allObjectsAfterCapture = document.querySelectorAll('object')
    if (allIframesAfterCapture.length > 0 || allEmbedsAfterCapture.length > 0 || allObjectsAfterCapture.length > 0) {
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:201',message:'IFRAMES IN GLOBAL DOM AFTER CAPTURE',data:{allIframesAfterCaptureCount:allIframesAfterCapture.length,allEmbedsAfterCaptureCount:allEmbedsAfterCapture.length,allObjectsAfterCaptureCount:allObjectsAfterCapture.length,canvasWidth:canvas.width,canvasHeight:canvas.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
    }
    // #endregion

    // Cria PDF com formato A4 padrão (portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const margin = 0 // Sem margem para usar toda a página
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - margin * 2
    const contentHeight = pageHeight - margin * 2

    // Converte mm -> px baseado na largura do canvas
    const pxPerMm = canvas.width / contentWidth
    const pageHeightPx = Math.floor(contentHeight * pxPerMm)

    // Overlap para evitar gaps por arredondamento
    const overlapPx = 4

    // Converte posições dos títulos de pixels do DOM para pixels do canvas
    // Considera a escala do html2canvas
    const canvasScale = canvas.width / tempDiv.scrollWidth
    const titlesInPx = sectionTitles.map(px => px * canvasScale)
    
    // Converte elementos de texto para pixels do canvas
    const textElementsInPx = textElements.map(({ top, bottom }) => ({
      top: top * canvasScale,
      bottom: bottom * canvasScale
    }))

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:114',message:'PDF generation start',data:{canvasHeight:canvas.height,canvasWidth:canvas.width,pageHeightPx,pxPerMm,overlapPx,titlesCount:titlesInPx.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    let yPx = 0
    let page = 0

    while (yPx < canvas.height) {
      const remainingPx = canvas.height - yPx
      const pageEndPx = yPx + pageHeightPx

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:129',message:'Page loop start',data:{page,yPx,remainingPx,pageEndPx,pageHeightPx},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Verifica se algum título seria cortado nesta página
      let adjustedHeightPx = pageHeightPx

      for (const titlePx of titlesInPx) {
        // Se o título começa nesta página mas está muito próximo do final
        if (titlePx > yPx && titlePx < pageEndPx) {
          const spaceAfterTitlePx = pageEndPx - titlePx
          const spaceAfterTitleMm = spaceAfterTitlePx / pxPerMm
          
          // Se há menos de 30mm após o título, quebra antes dele
          if (spaceAfterTitleMm < 30) {
            const breakBeforeTitlePx = titlePx - yPx
            const breakBeforeTitleMm = breakBeforeTitlePx / pxPerMm
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:145',message:'Title protection triggered',data:{titlePx,spaceAfterTitleMm,breakBeforeTitleMm,adjustedHeightPx},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            
            // Só ajusta se houver espaço suficiente (pelo menos 50mm na página)
            if (breakBeforeTitleMm >= 50) {
              adjustedHeightPx = breakBeforeTitlePx - (5 * pxPerMm)
              break
            }
          }
        }
      }

      // Verifica se algum elemento de texto seria cortado
      const sliceEndPx = yPx + adjustedHeightPx
      let textCutDetected = false
      let cutElementInfo = null
      
      for (const textElem of textElementsInPx) {
        // Verifica se o elemento está sendo cortado no meio
        // Elemento está sendo cortado se: começa antes do fim da fatia E termina depois do fim da fatia
        const elementStartsBeforeSliceEnd = textElem.top < sliceEndPx
        const elementEndsAfterSliceEnd = textElem.bottom > sliceEndPx
        const elementStartsInThisPage = textElem.top >= yPx
        const elementFitsCompletely = textElem.top >= yPx && textElem.bottom <= sliceEndPx
        const isCut = elementStartsBeforeSliceEnd && elementEndsAfterSliceEnd && !elementFitsCompletely && elementStartsInThisPage
        
        // #region agent log
        if (elementStartsBeforeSliceEnd && elementEndsAfterSliceEnd) {
          fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:220',message:'Text element check',data:{textElemTop:textElem.top,textElemBottom:textElem.bottom,yPx,sliceEndPx,elementStartsInThisPage,elementFitsCompletely,isCut},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        }
        // #endregion
        
        if (isCut) {
          textCutDetected = true
          cutElementInfo = {
            top: textElem.top,
            bottom: textElem.bottom,
            sliceEnd: sliceEndPx,
            cutAt: sliceEndPx - textElem.top,
            elementHeight: textElem.bottom - textElem.top
          }
          // Ajusta para quebrar antes do elemento (com margem de segurança)
          const breakBeforePx = textElem.top - yPx
          const minPageHeight = Math.floor(50 * pxPerMm)
          if (breakBeforePx >= minPageHeight) {
            adjustedHeightPx = breakBeforePx - (2 * pxPerMm) // Pequena margem
          }
          break
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:180',message:'Text cut detection',data:{textCutDetected,cutElementInfo,adjustedHeightPxBefore:pageHeightPx,adjustedHeightPxAfter:adjustedHeightPx},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Garante altura mínima e não ultrapassa o restante
      let sliceHeightPx = Math.max(
        Math.floor(50 * pxPerMm), // Mínimo 50mm
        Math.min(adjustedHeightPx, remainingPx)
      )

      // Verifica novamente se algum elemento seria cortado com a altura final calculada
      const finalSliceEndPx = yPx + sliceHeightPx
      for (const textElem of textElementsInPx) {
        // Verifica se o elemento está sendo cortado no meio
        // Elemento está sendo cortado se:
        // 1. Começa dentro ou antes da fatia atual (top < finalSliceEndPx)
        // 2. Termina depois do fim da fatia (bottom > finalSliceEndPx)
        // 3. Não está completamente dentro da fatia (não cabe inteiro)
        const elementStartsInOrBeforeSlice = textElem.top < finalSliceEndPx
        const elementEndsAfterSlice = textElem.bottom > finalSliceEndPx
        const elementFitsCompletely = textElem.top >= yPx && textElem.bottom <= finalSliceEndPx
        const isCut = elementStartsInOrBeforeSlice && elementEndsAfterSlice && !elementFitsCompletely
        
        if (isCut) {
          // Ajusta para quebrar antes do elemento (se ele começa nesta página)
          // ou no início do elemento (se ele começa antes)
          const elementStartInThisPage = textElem.top >= yPx
          const breakBeforePx = elementStartInThisPage 
            ? textElem.top - yPx  // Quebra antes do elemento
            : 0  // Se elemento começa antes, não podemos quebrar (já está na página)
          
          const minPageHeight = Math.floor(50 * pxPerMm)
          if (elementStartInThisPage && breakBeforePx >= minPageHeight) {
            const oldSliceHeightPx = sliceHeightPx
            sliceHeightPx = breakBeforePx - (2 * pxPerMm) // Pequena margem
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:270',message:'Final text cut adjustment',data:{textElemTop:textElem.top,textElemBottom:textElem.bottom,yPx,finalSliceEndPx,breakBeforePx,oldSliceHeightPx,newSliceHeightPx:sliceHeightPx,elementStartInThisPage},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            break
          }
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:210',message:'Slice calculation final',data:{sliceHeightPx,adjustedHeightPx,remainingPx,yPx,sliceEndPx:yPx+sliceHeightPx},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Cria um canvas "fatia" para esta página
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = sliceHeightPx

      const ctx = sliceCanvas.getContext('2d')
      if (ctx) {
        // Preenche fundo branco
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)

        // Desenha só o trecho do canvas original
        ctx.drawImage(
          canvas,
          0, yPx, canvas.width, sliceHeightPx,
          0, 0, canvas.width, sliceHeightPx
        )

        const sliceImg = sliceCanvas.toDataURL('image/jpeg', 0.95)

        if (page > 0) {
          pdf.addPage()
        }

        // Adiciona a fatia no PDF
        const sliceHeightMm = sliceHeightPx / pxPerMm
        pdf.addImage(sliceImg, 'JPEG', margin, margin, contentWidth, sliceHeightMm)
      }

      // #region agent log
      const nextYPx = yPx + sliceHeightPx - overlapPx
      fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:192',message:'Page advance calculation',data:{currentYPx:yPx,nextYPx,overlapPx,pageHeightPx,sliceHeightPx,gap:nextYPx-(yPx+sliceHeightPx)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Avança usando a altura real da fatia (não pageHeightPx) com overlap para evitar gaps
      yPx += sliceHeightPx - overlapPx
      page++
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:196',message:'PDF generation complete',data:{totalPages:page,canvasHeight:canvas.height},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Salva o PDF
    const filename = `${getFilenamePrefix(language)}-${formatDateForFilename(data.timestamp)}.pdf`
    pdf.save(filename)
  } finally {
    // Remove elemento temporário
    if (tempDiv.parentNode) {
      document.body.removeChild(tempDiv)
    }
  }
}

/**
 * Sanitiza HTML removendo iframes, embeds e outros elementos perigosos
 * Especialmente importante para a seção Chave Terapêutica do [RE]Sentir
 */
function sanitizeHTMLForPDF(html: string): string {
  if (!html) return ''

  // PRIMEIRO: normaliza escapes de string JS para entidades HTML (seguro)
  const normalized = normalizeHtmlEscapes(html)

  // Verifica conteúdo problemático (funciona em produção também)
  const hasIframe = /<iframe/i.test(normalized)
  const hasEmbed = /<embed/i.test(normalized)
  const hasObject = /<object/i.test(normalized)
  const hasScript = /<script/i.test(normalized)
  const hasIncorrectEscape = /\\"/.test(html)

  // #region agent log
  if (hasIframe || hasEmbed || hasObject || hasScript || hasIncorrectEscape) {
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:365',message:'Dangerous content before sanitization',data:{hasIframe,hasEmbed,hasObject,hasScript,hasIncorrectEscape,preview:normalized.substring(0,200),htmlLength:html.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  }
  // #endregion

  if (process.env.NODE_ENV === 'development') {
    if (hasIframe || hasEmbed || hasObject || hasScript || hasIncorrectEscape) {
      console.warn('[pdfGenerator] Conteúdo contém elementos perigosos antes da sanitização:', {
        hasIframe,
        hasEmbed,
        hasObject,
        hasScript,
        hasIncorrectEscape,
        preview: normalized.substring(0, 200)
      })
    }
  }

  let sanitized = normalized

  /**
   * 🔥 CRÍTICO: remover IFRAME mesmo que esteja malformado e sem </iframe>
   * (isso é exatamente o caso que faz "vazar" style="..." como texto)
   */
  sanitized = sanitized.replace(/<iframe\b[^>]*\/?>/gi, '')
  sanitized = sanitized.replace(/<\/iframe\s*>/gi, '')

  // Remove iframes com conteúdo (caso exista fechamento correto)
  sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')

  // Remove embeds
  sanitized = sanitized.replace(/<embed\b[^>]*\/?>/gi, '')
  sanitized = sanitized.replace(/<\/embed\s*>/gi, '')

  // Remove objects (que podem conter embeds)
  sanitized = sanitized.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
  sanitized = sanitized.replace(/<\/object\s*>/gi, '')

  // Remove scripts
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  sanitized = sanitized.replace(/<\/script\s*>/gi, '')

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')

  // Remove atributos sandbox/allow (defensivo)
  sanitized = sanitized.replace(/\s*sandbox\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*sandbox\s*=\s*[^\s>]*/gi, '')
  sanitized = sanitized.replace(/\s*allow\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/\s*allow\s*=\s*[^\s>]*/gi, '')

  // Remove links para iframes/embeds (src com iframe, embed, etc.)
  sanitized = sanitized.replace(/src\s*=\s*["'][^"']*(iframe|embed|object)[^"']*["']/gi, '')

  // Remove qualquer texto literal que contenha tags HTML problemáticas escapadas
  sanitized = sanitized.replace(/&lt;iframe[^&]*&gt;/gi, '')
  sanitized = sanitized.replace(/&lt;\/iframe&gt;/gi, '')
  sanitized = sanitized.replace(/&lt;embed[^&]*&gt;/gi, '')
  sanitized = sanitized.replace(/&lt;object[^&]*&gt;/gi, '')

  // Verifica se ainda há elementos perigosos após sanitização (funciona em produção)
  const stillHasIframe = /<iframe/i.test(sanitized)
  const stillHasEmbed = /<embed/i.test(sanitized)

  // #region agent log
  if (stillHasIframe || stillHasEmbed) {
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdfGenerator.ts:428',message:'Dangerous content AFTER sanitization',data:{stillHasIframe,stillHasEmbed,sanitizedLength:sanitized.length,htmlLength:html.length,preview:sanitized.substring(Math.max(0,sanitized.length-500))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  }
  // #endregion

  if (process.env.NODE_ENV === 'development') {
    if (stillHasIframe || stillHasEmbed) {
      console.error('[pdfGenerator] AVISO: Ainda há elementos perigosos após sanitização!', {
        stillHasIframe,
        stillHasEmbed
      })
    } else if (html !== sanitized) {
      console.log('[pdfGenerator] HTML sanitizado com sucesso - elementos perigosos removidos')
    }
  }

  return sanitized
}

/**
 * Processa conteúdo markdown para HTML com seções estruturadas
 */
function processMarkdownToHTML(content: string, _language: LanguageCode = 'pt-BR'): string {
  if (!content || content.trim().length === 0) {
    return '<p>Conteúdo não disponível.</p>'
  }

  // Lista de SEÇÕES PRINCIPAIS conhecidas - apenas essas são tratadas como seções
  // Tudo que está em negrito mas não está nesta lista é tratado como conteúdo normal
  const mainSections = [
    'Contexto Geral',
    'Contexto General',
    'General Context',
    'Impacto Biológico',
    'Biological Impact',
    'Símbolos Biológicos',
    'Biological Symbols',
    'Biological Symbol',
    'Conflito Emocional Subjacente',
    'Conflicto Emocional Subyacente',
    'Underlying Emotional Conflict',
    'Experiências comuns',
    'Experiencias comunes',
    'Common Experiences',
    'Padrões de comportamento',
    'Patrones de comportamento',
    'Behavior Patterns',
    'Behavioral Patterns',
    'Impacto Transgeracional',
    'Impacto Transgeneracional',
    'Transgenerational Impact',
    'Lateralidade',
    'Lateralidad',
    'Laterality',
    'Fases da doença',
    'Fases de la enfermedad',
    'Disease Phases',
    'Phases of the Condition',
    'Fases da manifestação',
    'Phases of manifestation',
    'Possíveis doenças correlacionadas',
    'Posibles enfermedades correlacionadas',
    'Possible Correlated Diseases',
    'Possible Related Conditions',
    'Possible Correlated Conditions',
    'Perguntas Reflexivas',
    'Preguntas Reflexivas',
    'Reflective Questions',
    'Chave Terapêutica do [RE]Sentir',
    'Clave Terapéutica del [RE]Sentir',
    'Therapeutic Key of [RE]Feeling',
    'Therapeutic Key of [RE]Sentir',
    '[RE]Sentir Therapeutic Key'
  ]

  // Função para verificar se um título é uma seção principal
  function isMainSection(title: string): boolean {
    const titleLower = title.toLowerCase().trim()
    return mainSections.some(section => {
      const sectionLower = section.toLowerCase()
      return titleLower === sectionLower || titleLower.includes(sectionLower) || sectionLower.includes(titleLower)
    })
  }

  // Extrai apenas as seções principais
  const sections: Array<{ title: string; content: string; index: number }> = []

  // Procura por textos em negrito no formato **Título** ou **Título:**
  const boldPattern = /\*\*([^*]+?)\*\*:?\s*\n/g
  const matches = Array.from(content.matchAll(boldPattern))

  // Filtra apenas as seções principais
  const mainSectionMatches = matches.filter(match => {
    const title = match[1].trim()
    return isMainSection(title)
  })

  // Processa cada seção principal
  for (let i = 0; i < mainSectionMatches.length; i++) {
    const match = mainSectionMatches[i]
    const title = match[1].trim()
    const startIndex = match.index! + match[0].length

    // Determina onde termina o conteúdo desta seção (até a próxima seção principal ou fim)
    const endIndex =
      i < mainSectionMatches.length - 1 ? mainSectionMatches[i + 1].index! : content.length

    // Extrai TODO o conteúdo da seção (incluindo textos em negrito que são parte do conteúdo)
    const sectionContent = content.substring(startIndex, endIndex).trim()

    if (sectionContent.length > 0) {
      sections.push({
        title,
        content: sectionContent,
        index: match.index!
      })
    }
  }

  // Ordena seções pela posição no documento
  sections.sort((a, b) => a.index - b.index)

  let html = ''

  // Processa cada seção
  for (const section of sections) {
    const titleLower = section.title.toLowerCase()

    // Contexto Geral e Impacto Biológico sempre sem listas (apenas parágrafos)
    const isParagraphOnly =
      titleLower.includes('contexto geral') ||
      titleLower.includes('general context') ||
      titleLower.includes('contexto general') ||
      titleLower.includes('impacto biológico') ||
      titleLower.includes('biological impact')

    // Lateralidade precisa de tratamento especial para subseções
    const isLateralidade = titleLower.includes('lateralidade') || titleLower.includes('laterality')

    // Chave Terapêutica do [RE]Sentir precisa de sanitização especial
    const isTherapeuticKey =
      titleLower.includes('chave terapêutica') ||
      titleLower.includes('therapeutic key') ||
      titleLower.includes('clave terapéutica') ||
      titleLower.includes('ressentir') ||
      titleLower.includes('refeeling')

    // DEBUG: Log para rastrear seção Chave Terapêutica
    if (process.env.NODE_ENV === 'development' && isTherapeuticKey) {
      console.log('[pdfGenerator] Processando seção Chave Terapêutica do [RE]Sentir')
      console.log('[pdfGenerator] Conteúdo original (primeiros 300 chars):', section.content.substring(0, 300))
    }

    // Todas as outras seções podem ter listas
    const allowLists = !isParagraphOnly

    // Processa conteúdo com tratamento especial para Lateralidade
    let processedContent = processContentToHTML(section.content, allowLists)

    // Tratamento especial para Lateralidade: formata subseções
    if (isLateralidade) {
      processedContent = processLateralidadeContent(processedContent)
    }

    // CRÍTICO: Sanitização especial para Chave Terapêutica do [RE]Sentir
    if (isTherapeuticKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[pdfGenerator] Aplicando sanitização na seção Chave Terapêutica')
        console.log('[pdfGenerator] Conteúdo antes da sanitização (primeiros 300 chars):', processedContent.substring(0, 300))
      }

      processedContent = sanitizeHTMLForPDF(processedContent)

      if (process.env.NODE_ENV === 'development') {
        console.log('[pdfGenerator] Conteúdo após sanitização (primeiros 300 chars):', processedContent.substring(0, 300))
      }
    }

    html += `<div class="content-section">
      <div class="content-section-title">${section.title.toUpperCase()}</div>
      <div class="content-section-body">${processedContent}</div>
    </div>`
  }

  // Se não encontrou seções, processa o conteúdo completo
  if (!html) {
    html = `<div class="content-section-body">${processContentToHTML(content, false)}</div>`
  }

  return html
}

/**
 * Processa conteúdo markdown para HTML
 * @param text - Texto markdown a processar
 * @param allowLists - Se true, processa listas com ícones. Se false, converte tudo em parágrafos
 */
function processContentToHTML(text: string, allowLists: boolean = true): string {
  if (!text) return ''

  // DEBUG: Verifica se há iframes/embeds no conteúdo antes de processar
  if (process.env.NODE_ENV === 'development') {
    const hasIframe = /<iframe/i.test(text) || /iframe/i.test(text)
    const hasEmbed = /<embed/i.test(text) || /embed/i.test(text)
    if (hasIframe || hasEmbed) {
      console.warn('[pdfGenerator] processContentToHTML: Conteúdo contém iframe/embed antes do processamento:', {
        hasIframe,
        hasEmbed,
        preview: text.substring(0, 200)
      })
    }
  }

  // PRIMEIRO: normaliza escapes de string JS para entidades HTML (seguro)
  const normalizedText = normalizeHtmlEscapes(text)

  // Remove iframes e embeds do texto ANTES de processar markdown
  // 🔥 CRÍTICO: remove também abertura sem fechamento (iframe malformado)
  const cleanedText = normalizedText
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    .replace(/<\/iframe\s*>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<\/embed\s*>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<\/object\s*>/gi, '')
    .replace(/sandbox\s*=\s*["'][^"']*["']/gi, '')
    .replace(/allow\s*=\s*["'][^"']*["']/gi, '')

  // Primeiro processa negrito e itálico
  let html = cleanedText
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  // Se não permite listas, converte tudo em parágrafos preservando quebras de linha
  if (!allowLists) {
    // Remove marcadores de lista
    html = html.replace(/^[-•]\s+/gm, '')

    // Normaliza quebras de linha múltiplas (3+ viram 2)
    html = html.replace(/\n{3,}/g, '\n\n')

    // Divide por parágrafos duplos (quebras de linha duplas)
    const paragraphs = html.split(/\n\n+/)

    return paragraphs
      .map(p => {
        const trimmed = p.trim()
        if (!trimmed) return ''

        // Preserva quebras de linha simples dentro do parágrafo
        const withBreaks = trimmed
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('<br />')

        return `<p>${withBreaks}</p>`
      })
      .filter(p => p.length > 0)
      .join('')
  }

  // Se permite listas, processa normalmente preservando quebras de linha
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  let currentList: string[] = []
  let inNumberedList = false
  let currentNumberedList: string[] = []
  let currentParagraphLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Detecta perguntas numeradas (#1, #2, etc.)
    const numberedMatch = trimmedLine.match(/^#(\d+)/)
    if (numberedMatch) {
      // Fecha parágrafo acumulado se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }

      if (!inNumberedList) {
        inNumberedList = true
        currentNumberedList = []
        // Fecha lista normal se estiver aberta
        if (inList) {
          processedLines.push(`<ul>${currentList.join('')}</ul>`)
          currentList = []
          inList = false
        }
      }
      // Extrai o número e o texto da pergunta
      const questionNumber = numberedMatch[1]
      let questionText = trimmedLine.replace(/^#\d+\s*/, '').trim()
      // Preserva quebras de linha dentro da pergunta convertendo em <br />
      questionText = questionText.replace(/\n/g, '<br />')
      currentNumberedList.push(
        `<li class="numbered-question" data-number="#${questionNumber}">${questionText}</li>`
      )
      continue
    }

    // Verifica se é uma linha de lista (começa com - ou •)
    if (/^[-•]\s+/.test(trimmedLine)) {
      // Fecha parágrafo acumulado se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }

      // Fecha lista numerada se estiver aberta
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }

      if (!inList) {
        inList = true
        currentList = []
      }
      // Remove o marcador e adiciona à lista
      let listItem = trimmedLine.replace(/^[-•]\s+/, '')
      listItem = listItem.replace(/\n/g, '<br />')
      currentList.push(`<li>${listItem}</li>`)
    } else if (trimmedLine.length === 0) {
      // Linha vazia - fecha parágrafo atual se houver
      if (currentParagraphLines.length > 0) {
        processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
        currentParagraphLines = []
      }

      // Fecha listas se estiverem abertas
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }
      if (inList) {
        processedLines.push(`<ul>${currentList.join('')}</ul>`)
        currentList = []
        inList = false
      }
    } else {
      // Fecha listas se estiverem abertas
      if (inNumberedList) {
        processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
        currentNumberedList = []
        inNumberedList = false
      }
      if (inList) {
        processedLines.push(`<ul>${currentList.join('')}</ul>`)
        currentList = []
        inList = false
      }

      // Adiciona linha ao parágrafo atual (preserva quebras de linha)
      currentParagraphLines.push(trimmedLine)
    }
  }

  // Fecha listas se ainda estiverem abertas
  if (inNumberedList && currentNumberedList.length > 0) {
    processedLines.push(`<ol class="numbered-questions">${currentNumberedList.join('')}</ol>`)
  }
  if (inList && currentList.length > 0) {
    processedLines.push(`<ul>${currentList.join('')}</ul>`)
  }

  // Fecha último parágrafo se houver
  if (currentParagraphLines.length > 0) {
    processedLines.push(`<p>${currentParagraphLines.join('<br />')}</p>`)
  }

  // Junta tudo
  html = processedLines.join('')

  return html
}

/**
 * Processa conteúdo de Lateralidade com subseções especiais
 */
function processLateralidadeContent(html: string): string {
  // Detecta e formata subseções especiais
  // Lado Direito, Lado Esquerdo, ATENÇÃO!, DICA:
  html = html.replace(
    /<p><strong>(Lado Direito|Lado Esquerdo|Right Side|Left Side):?<\/strong><\/p>/gi,
    '<p class="lateralidade-subsection"><strong>$1:</strong></p>'
  )

  html = html.replace(
    /<p><strong>(ATENÇÃO!|ATTENTION!|⚠️|⚠)<\/strong><\/p>/gi,
    '<p class="lateralidade-warning"><strong>$1</strong></p>'
  )

  html = html.replace(
    /<p><strong>(DICA:|TIP:|💡):?<\/strong><\/p>/gi,
    '<p class="lateralidade-tip"><strong>$1</strong></p>'
  )

  return html
}

/**
 * Cria o HTML completo do PDF
 */
function createPDFHTML(data: PDFData, language: LanguageCode): string {
  const formattedDate = formatDate(data.timestamp)
  const formattedTime = formatTime(data.timestamp)
  let processedAnswer = processMarkdownToHTML(data.answer, language)

  // CRÍTICO: normaliza escapes para entidades HTML (sem quebrar atributos)
  processedAnswer = normalizeHtmlEscapes(processedAnswer)

  const translations = getTranslations(language)

  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${translations.reportTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        
        @media print {
          body {
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 20mm;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: white;
          font-size: 14px;
          padding: 20px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          max-width: 210mm;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #4f46e5;
        }

        .logo {
          font-size: 26px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 10px;
          letter-spacing: -0.5px;
        }

        .logo .highlight {
          color: #fbbf24;
        }

        .therapist-name {
          font-size: 30px;
          font-weight: 700;
          color: #111827;
          margin-top: 14px;
          margin-bottom: 10px;
          letter-spacing: -0.3px;
        }

        .title {
          font-size: 15px;
          color: #6b7280;
          font-weight: 500;
          margin-top: 4px;
        }

        .metadata {
          margin-bottom: 24px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: flex-start;
        }

        .metadata-item {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 12px;
          color: #374151;
          padding: 10px 14px;
          background: #f0f9ff;
          border-radius: 8px;
          border: 1px solid #e0f2fe;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .metadata-label {
          font-weight: 600;
          color: #4f46e5;
        }

        .metadata-value {
          color: #1f2937;
          font-weight: 500;
        }

        .question-section {
          margin-top: 20px;
          margin-bottom: 28px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .question-content {
          font-size: 15px;
          line-height: 1.7;
          color: #1f2937;
          padding: 14px 16px;
          background: #f0f9ff;
          border-radius: 8px;
          border-left: 3px solid #4f46e5;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .answer-section {
          margin-top: 24px;
          margin-bottom: 32px;
        }

        .answer-content {
          margin-top: 12px;
          font-size: 14px;
          line-height: 1.75;
          color: #1f2937;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .answer-content strong {
          font-weight: 700;
          color: #111827;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .answer-content em {
          font-style: italic;
          color: #6b7280;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .content-section {
          margin-bottom: 32px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .content-section-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding-left: 14px;
          border-left: 3px solid #4f46e5;
        }

        .content-section-body {
          padding-left: 18px;
          margin-top: 12px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .content-section-body p {
          margin-bottom: 14px;
          text-align: justify;
          line-height: 1.7;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .content-section-body p:last-child {
          margin-bottom: 0;
        }

        .content-section-body ul {
          list-style: none;
          padding-left: 0;
          margin-bottom: 16px;
          margin-top: 8px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .content-section-body ul:last-child {
          margin-bottom: 0;
        }

        .content-section-body li {
          margin-bottom: 14px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.8;
          text-align: justify;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .content-section-body li:last-child {
          margin-bottom: 0;
        }

        .content-section-body li::before {
          content: '✓';
          font-size: 16px;
          margin-right: 8px;
          color: #10b981;
          font-weight: bold;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .content-section-body ol.numbered-questions {
          list-style: none;
          padding-left: 0;
          margin-bottom: 16px;
          margin-top: 8px;
        }

        .content-section-body ol.numbered-questions:last-child {
          margin-bottom: 0;
        }

        .content-section-body li.numbered-question {
          margin-bottom: 16px;
          font-style: italic;
          color: #4b5563;
          line-height: 1.8;
          padding-left: 24px;
          position: relative;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .content-section-body li.numbered-question:last-child {
          margin-bottom: 0;
        }

        .content-section-body li.numbered-question::before {
          content: attr(data-number);
          position: absolute;
          left: 0;
          font-weight: 600;
          color: #4f46e5;
          font-style: normal;
        }

        /* Melhora espaçamento entre parágrafos */
        .content-section-body p + p {
          margin-top: 14px;
        }

        /* Melhora quebras de linha dentro de parágrafos */
        .content-section-body p br {
          line-height: 1.8;
        }

        /* Estilos para subseções de Lateralidade */
        .content-section-body p.lateralidade-subsection {
          font-weight: 600;
          color: #1f2937;
          margin-top: 16px;
          margin-bottom: 8px;
        }

        .content-section-body p.lateralidade-subsection:first-child {
          margin-top: 0;
        }

        .content-section-body p.lateralidade-warning {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 10px 12px;
          margin: 14px 0;
          border-radius: 4px;
          font-weight: 600;
          color: #92400e;
        }

        .content-section-body p.lateralidade-tip {
          background: #ecfdf5;
          border-left: 4px solid #10b981;
          padding: 10px 12px;
          margin: 14px 0;
          border-radius: 4px;
          font-weight: 600;
          color: #065f46;
        }

        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }

        .footer-logo {
          font-size: 20px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 15px;
        }

        .footer-logo .highlight {
          color: #fbbf24;
        }

        .disclaimer {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 10px;
          margin-top: 15px;
          font-size: 10px;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          me<span class="highlight">DIZ</span>!
        </div>
        ${data.therapistName ? `<div class="therapist-name">${escapeHtml(data.therapistName)}</div>` : ''}
        <div class="title">${translations.reportTitle}</div>
      </div>

      <div class="metadata">
        ${data.patientName ? `
        <div class="metadata-item">
          <span class="metadata-label">👤 ${translations.patient}</span>
          <span class="metadata-value">${escapeHtml(data.patientName)}</span>
        </div>
        ` : ''}
        <div class="metadata-item">
          <span class="metadata-label">📅 ${translations.date}</span>
          <span class="metadata-value">${formattedDate}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">🕐 ${translations.time}</span>
          <span class="metadata-value">${formattedTime}</span>
        </div>
      </div>

      <div class="question-section">
        <div class="section-title">${translations.symptom}</div>
        <div class="question-content">
          ${escapeHtml(data.question)}
        </div>
      </div>

      <div class="answer-section">
        <div class="section-title">💡 ${translations.response}</div>
        <div class="answer-content">
          ${processedAnswer || '<p>Conteúdo não disponível.</p>'}
        </div>
      </div>

      <div class="footer">
        <div class="footer-logo">
          me<span class="highlight">DIZ</span>!
        </div>
        <div class="disclaimer">
          ${translations.disclaimer}
        </div>
        <div style="margin-top: 12px;">
          © ${new Date().getFullYear()} ${translations.copyright}
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Traduções por idioma
 */
function getTranslations(language: LanguageCode) {
  const translations: Record<LanguageCode, {
    reportTitle: string
    symptom: string
    response: string
    patient: string
    date: string
    time: string
    disclaimer: string
    copyright: string
  }> = {
    'pt-BR': {
      reportTitle: 'Relatório de Origem Emocional',
      symptom: 'Sintoma',
      response: 'Resposta',
      patient: 'Paciente:',
      date: 'Data:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Sempre consulte um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
      copyright: 'Relatório de Origem Emocional'
    },
    'pt-PT': {
      reportTitle: 'Relatório de Origem Emocional',
      symptom: 'Sintoma',
      response: 'Resposta',
      patient: 'Paciente:',
      date: 'Data:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Consulte sempre um profissional de saúde qualificado antes de tomar decisões relacionadas à sua saúde.',
      copyright: 'Relatório de Origem Emocional'
    },
    en: {
      reportTitle: 'Emotional Origin Report',
      symptom: 'Symptom',
      response: 'Response',
      patient: 'Patient:',
      date: 'Date:',
      time: 'Time:',
      disclaimer: '⚠️ Important: Always consult a qualified health professional before making decisions related to your health.',
      copyright: 'Emotional Origin Report'
    },
    es: {
      reportTitle: 'Informe de Origen Emocional',
      symptom: 'Síntoma',
      response: 'Respuesta',
      patient: 'Paciente:',
      date: 'Fecha:',
      time: 'Hora:',
      disclaimer: '⚠️ Importante: Siempre consulte a un profesional de salud cualificado antes de tomar decisiones relacionadas con su salud.',
      copyright: 'Informe de Origen Emocional'
    }
  }

  return translations[language] || translations['pt-BR']
}

/**
 * Prefixo do nome do arquivo por idioma
 */
function getFilenamePrefix(language: LanguageCode): string {
  const prefixes: Record<LanguageCode, string> = {
    'pt-BR': 'relatorio-de-origem-emocional',
    'pt-PT': 'relatorio-de-origem-emocional',
    en: 'emotional-origin-report',
    es: 'informe-de-origen-emocional'
  }
  return prefixes[language] || prefixes['pt-BR']
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata hora para exibição
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formata data para nome do arquivo
 */
function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Normaliza escapes incorretos de JavaScript para HTML válido
 *
 * ⚠️ IMPORTANTE:
 * - NÃO faça \\" -> " (isso quebra atributos tipo srcdoc="...").
 * - Em vez disso, converta para entidades HTML seguras (&quot;).
 */
function normalizeHtmlEscapes(html: string): string {
  if (!html) return ''

  let normalized = html

  // Converte aspas escapadas de JS para entidade HTML segura
  // Ex: srcdoc=\"...\" vira srcdoc=&quot;...&quot; (não quebra o HTML)
  normalized = normalized.replace(/\\"/g, '&quot;')

  // Converte \' para &#39; (seguro)
  normalized = normalized.replace(/\\'/g, '&#39;')

  // Converte \\ para \ (mantém)
  normalized = normalized.replace(/\\\\/g, '\\')

  return normalized
}

/**
 * Escapa caracteres HTML para segurança
 */
function escapeHtml(text: string): string {
  if (!text) return ''
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
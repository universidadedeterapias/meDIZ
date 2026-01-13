// app/api/openai/route.ts
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
// Removido getMessages - não usamos mais busca do banco, resposta vem direto do webhook
import { createChatSessionWithThread } from '@/lib/chatService'
import { saveChatMessage } from '@/lib/chatMessages'
import { prisma } from '@/lib/prisma'
import { getUserLimits, getUserPeriod } from '@/lib/userPeriod'
import { NextResponse } from 'next/server'
// Cache desabilitado para evitar problemas com tradução multi-idioma
import { DEFAULT_LANGUAGE, isSupportedLanguage, getLanguageMapping, type LanguageCode } from '@/i18n/config'

const CHAT_WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL ?? 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/chat-texto'

// Log da URL configurada (sem expor variáveis de ambiente sensíveis)
console.log('🔧 [API OPENAI] Webhook URL configurada:', CHAT_WEBHOOK_URL)
console.log('🔧 [API OPENAI] Usando variável de ambiente?', !!process.env.N8N_CHAT_WEBHOOK_URL)

async function requestAssistantResponse(
  threadId: string,
  message: string,
  language: LanguageCode
) {
  // Obtém mapeamento completo do idioma
  const langMapping = getLanguageMapping(language)
  
  // Ao invés de traduzir, adiciona uma tag de idioma explícita à mensagem
  // Isso funciona melhor para frases longas e garante que o webhook entenda o idioma desejado
  let messageWithLanguage = message
  
  // Se o idioma não é português, adiciona tag de idioma no início da mensagem
  if (language !== 'pt-BR' && language !== 'pt-PT') {
    const languageTag = language === 'en' ? '[english]' : language === 'es' ? '[espanol]' : `[${language}]`
    messageWithLanguage = `${languageTag} ${message}`
  }
  
  // Envia o idioma em múltiplos formatos para garantir que o n8n entenda
  const payload = {
    threadId,
    sintoma: messageWithLanguage, // Mensagem original com tag de idioma
    sintomaOriginal: message, // Mantém a mensagem original também
    // Formatos principais (retrocompatibilidade)
    language: language,
    lang: langMapping.iso6391,
    locale: language,
    // Formatos alternativos para garantir compatibilidade
    idioma: langMapping.namePortuguese,
    idiomaResposta: langMapping.nameNative,
    responderEm: langMapping.nameNative,
    // Códigos ISO padrão
    iso6391: langMapping.iso6391,
    iso6392: langMapping.iso6392,
    // Instrução explícita para o agente
    instrucaoIdioma: langMapping.instruction,
    languageInstruction: langMapping.instruction,
    // Nomes em diferentes idiomas
    languageName: langMapping.nameEnglish,
    nomeIdioma: langMapping.namePortuguese
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/route.ts:58',message:'WEBHOOK REQUEST - URL e Payload',data:{webhookUrl:CHAT_WEBHOOK_URL,payload,threadId,message:message.substring(0,100),language},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  console.log('🌐 [API OPENAI] ========== CHAMANDO WEBHOOK ==========')
  console.log('🌐 [API OPENAI] URL:', CHAT_WEBHOOK_URL)
  console.log('🌐 [API OPENAI] Payload:', JSON.stringify(payload, null, 2))
  
  const response = await fetch(CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/route.ts:67',message:'WEBHOOK RESPONSE - Status',data:{status:response.status,statusText:response.statusText,ok:response.ok,url:response.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  console.log('🌐 [API OPENAI] Status da resposta:', response.status, response.statusText)
  console.log('🌐 [API OPENAI] URL da resposta:', response.url)

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Webhook do n8n retornou ${response.status} - ${response.statusText} ${errorText ? `- ${errorText}` : ''}`
    )
  }

  const responseText = await response.text()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/route.ts:73',message:'WEBHOOK RESPONSE - Raw Text',data:{responseLength:responseText.length,responsePreview:responseText.substring(0,500),isJSON:responseText.trim().startsWith('{')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  console.log('🌐 [API OPENAI] Resposta RAW do webhook (primeiros 500 chars):', responseText.substring(0, 500))
  console.log('🌐 [API OPENAI] Tamanho total da resposta:', responseText.length)
  
  let assistantReply: string
  
  // Tenta parsear como JSON primeiro (webhook pode retornar {"resposta":"..."})
  try {
    const jsonResponse = JSON.parse(responseText)
    
    // Prioriza campos comuns: output (n8n), resposta, response, message, text, content
    assistantReply = 
      jsonResponse.output ||        // Campo usado pelo n8n ({{ $json.output }})
      jsonResponse.resposta || 
      jsonResponse.response || 
      jsonResponse.message || 
      jsonResponse.text || 
      jsonResponse.content ||
      (typeof jsonResponse === 'string' ? jsonResponse : responseText)
    
    console.log('🌐 [API OPENAI] JSON parseado, campos disponíveis:', Object.keys(jsonResponse))
    console.log('🌐 [API OPENAI] Campo usado:', jsonResponse.output ? 'output' : jsonResponse.resposta ? 'resposta' : jsonResponse.response ? 'response' : 'outro')
  } catch {
    // Se não for JSON, usa o texto direto
    assistantReply = responseText
    console.log('🌐 [API OPENAI] Resposta não é JSON, usando texto direto')
  }
  
  // Processa apenas o necessário: preserva o formato markdown original
  let normalized = assistantReply.trim()
  
  // Apenas processa escapes de string literal se realmente existirem
  // Verifica se há escapes antes de processar (evita processar desnecessariamente)
  if (normalized.includes('\\n') || normalized.includes('\\r') || normalized.includes('\\t')) {
    // Processa escapes de string literal de forma iterativa (máximo 3 iterações)
    let previousLength = 0
    let iterations = 0
    while (normalized.length !== previousLength && iterations < 3) {
      previousLength = normalized.length
      iterations++
      
      // Processa escapes na ordem correta (do mais específico para o mais genérico)
      normalized = normalized
        .replace(/\\\\n/g, '\n')      // Escape duplo: \\n -> quebra de linha
        .replace(/\\\\r/g, '')        // Escape duplo: \\r -> remove
        .replace(/\\\\t/g, ' ')       // Escape duplo: \\t -> espaço
        .replace(/\\\\"/g, '"')       // Escape duplo: \\" -> "
        .replace(/\\n/g, '\n')        // Escape simples: \n -> quebra de linha
        .replace(/\\r/g, '')          // Escape simples: \r -> remove
        .replace(/\\t/g, ' ')         // Escape simples: \t -> espaço
        .replace(/\\"/g, '"')         // Escape simples: \" -> "
    }
  }
  
  // Remove apenas espaços extras no início/fim (preserva formatação interna)
  normalized = normalized.trim()

  // Remove apenas linhas vazias excessivas no início e fim (preserva estrutura markdown)
  normalized = normalized.replace(/^\n{3,}/g, '\n\n').replace(/\n{3,}$/g, '\n\n')
  
  if (!normalized || normalized.length === 0) {
    throw new Error('Webhook do n8n retornou resposta vazia após processamento')
  }
  
  return normalized
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const userId = session.user.id
  const body = await req.json()
  const rawMessage = typeof body?.message === 'string' ? body.message : ''
  const message = rawMessage.trim()
  const requestedLanguage = typeof body?.language === 'string' ? (body.language as string) : undefined
  const language: LanguageCode = isSupportedLanguage(requestedLanguage)
    ? (requestedLanguage as LanguageCode)
    : DEFAULT_LANGUAGE

  if (!message) {
    return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  // ── 1) Verifica limite de sessões hoje ─────────────────────────────
  // Início do dia (00:00)
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // Conta quantas ChatSession o usuário já criou hoje
  const todayCount = await prisma.chatSession.count({
    where: {
      userId,
      createdAt: { gte: startOfDay }
    }
  })

  // ── 2) Verifica assinatura ativa ──────────────────────────────────
  const hasActiveSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['active', 'ACTIVE', 'cancel_at_period_end']
      },
      currentPeriodEnd: {
        gte: new Date()
      }
    },
    select: {
      id: true // Só seleciona o ID para verificar existência
    }
  })

  // ── 3) Se não tiver assinatura, aplica regras do plano gratuito ──────
  if (!hasActiveSubscription) {
    // Busca informações do usuário para saber a data de cadastro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Determina o período e limites do usuário
    const userPeriod = getUserPeriod(user.createdAt)
    const { searchLimit } = getUserLimits(userPeriod)

    // Verifica se excedeu o limite baseado no período
    if (todayCount >= searchLimit) {
      return NextResponse.json(
        {
          limitReached: true,
          period: userPeriod,
          searchLimit
        },
        { status: 403 }
      )
    }
  }

  try {
    // ── 4) Cria identificador local e registra ChatSession ─────────────
    const threadId = randomUUID()
    const chatSession = await createChatSessionWithThread(userId, threadId)

    // ── 5) Persiste mensagem do usuário antes de chamar o webhook ─────
    await saveChatMessage({
      chatSessionId: chatSession.id,
      role: 'USER',
      content: message
    })

    // ── 6) Chama o webhook diretamente (cache desabilitado para evitar problemas com tradução) ───────────────────
    console.log('🤖 [API OPENAI] ========== CHAMANDO WEBHOOK ==========')
    console.log('🤖 [API OPENAI] Thread ID:', threadId)
    console.log('🤖 [API OPENAI] Mensagem:', message.substring(0, 100))
    console.log('🤖 [API OPENAI] Idioma:', language)
    
    // Obtém resposta diretamente do webhook (n8n)
    const webhookResponse = await requestAssistantResponse(threadId, message, language)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/route.ts:227',message:'Webhook response received',data:{replyLength:webhookResponse.length,replyPreview:webhookResponse.substring(0,200),threadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.log('🤖 [API OPENAI] Resposta recebida do webhook (n8n)')
    console.log('🤖 [API OPENAI] Tamanho da resposta:', webhookResponse.length)
    
    // ── 7) Processa resposta do webhook e salva no banco (apenas para histórico) ───────────
    // Remove iframes se houver
    let finalContent = webhookResponse
    const hasIframe = /<iframe/i.test(finalContent)
    if (hasIframe) {
      console.warn('⚠️ [API OPENAI] Iframe detectado, removendo...')
      finalContent = finalContent
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
        .replace(/<iframe\b[^>]*\/?>/gi, '')
        .replace(/<\/iframe\s*>/gi, '')
    }
    
    // Salva no banco apenas para histórico (não usa para resposta)
    if (finalContent && finalContent.trim().length > 0) {
      await saveChatMessage({
        chatSessionId: chatSession.id,
        role: 'ASSISTANT',
        content: finalContent.trim()
      })
      console.log('✅ [API OPENAI] Resposta salva no banco (histórico)')
    }
    
    // ── 8) Retorna resposta diretamente do webhook (n8n) ───────────
    // A resposta vem diretamente do webhook, não do banco
    const responses = {
      assistant: [webhookResponse.trim()], // Resposta direta do n8n
      user: [message] // Mensagem do usuário
    }
    
    console.log('📤 [API OPENAI] Retornando resposta do webhook (n8n):', {
      assistantLength: responses.assistant[0].length,
      preview: responses.assistant[0].substring(0, 100)
    })

    // ── 8) Se não tiver assinatura, inclui informações do período na resposta ───
    if (!hasActiveSubscription) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
      })

      if (user) {
        const userPeriod = getUserPeriod(user.createdAt)
        const { fullVisualization } = getUserLimits(userPeriod)

        return NextResponse.json({
          responses,
          threadId,
          userPeriod,
          fullVisualization,
          shouldShowPopup: true // Flag para indicar que deve mostrar o popup
        })
      }
    }

    return NextResponse.json({ responses, threadId })
  } catch (err) {
    // Retorna mensagem de erro mais específica
    const errorMessage = err instanceof Error ? err.message : String(err)
    let errorResponse = 'Erro ao processar assistant'
    
    if (errorMessage.includes('Webhook do n8n')) {
      errorResponse = 'Erro ao comunicar com o serviço de IA. Tente novamente em alguns instantes.'
    } else if (errorMessage.includes('resposta vazia')) {
      errorResponse = 'O serviço de IA não retornou uma resposta válida. Tente novamente.'
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      errorResponse = 'Não foi possível conectar ao serviço. Verifique sua conexão.'
    }
    
    return NextResponse.json({ 
      error: errorResponse,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}

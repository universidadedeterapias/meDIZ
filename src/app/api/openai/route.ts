// app/api/openai/route.ts
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { getMessages } from '@/lib/assistant'
import { createChatSessionWithThread } from '@/lib/chatService'
import { saveChatMessage } from '@/lib/chatMessages'
import { prisma } from '@/lib/prisma'
import { getUserLimits, getUserPeriod } from '@/lib/userPeriod'
import { NextResponse } from 'next/server'
// Cache desabilitado para evitar problemas com tradução multi-idioma
import { DEFAULT_LANGUAGE, isSupportedLanguage, getLanguageMapping, type LanguageCode } from '@/i18n/config'

const CHAT_WEBHOOK_URL =
  process.env.N8N_CHAT_WEBHOOK_URL ?? 'https://uniterapias.app.n8n.cloud/webhook/chat-texto'

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
  
  const response = await fetch(CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `Webhook do n8n retornou ${response.status} - ${response.statusText} ${errorText ? `- ${errorText}` : ''}`
    )
  }

  const responseText = await response.text()
  
  let assistantReply: string
  
  // Tenta parsear como JSON primeiro (webhook pode retornar {"resposta":"..."})
  try {
    const jsonResponse = JSON.parse(responseText)
    
    // Prioriza campos comuns: resposta, response, message, text, content
    assistantReply = 
      jsonResponse.resposta || 
      jsonResponse.response || 
      jsonResponse.message || 
      jsonResponse.text || 
      jsonResponse.content ||
      (typeof jsonResponse === 'string' ? jsonResponse : responseText)
  } catch {
    // Se não for JSON, usa o texto direto
    assistantReply = responseText
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
    let assistantReply = await requestAssistantResponse(threadId, message, language)

    // Garante que não estamos salvando JSON no banco
    // Se ainda for JSON, tenta extrair novamente
    if (assistantReply.trim().startsWith('{')) {
      try {
        const jsonParsed = JSON.parse(assistantReply)
        assistantReply = jsonParsed.resposta || jsonParsed.response || jsonParsed.message || assistantReply
      } catch {
        // Erro silencioso - continua com o valor original
      }
    }

    // Garante que estamos salvando apenas markdown puro
    if (assistantReply) {
      // Remove qualquer JSON wrapper que possa ter sobrado
      const finalContent = assistantReply.trim().startsWith('{') 
        ? (() => {
            try {
              const parsed = JSON.parse(assistantReply)
              return parsed.resposta || parsed.response || parsed.message || assistantReply
            } catch {
              return assistantReply
            }
          })()
        : assistantReply
      
      await saveChatMessage({
        chatSessionId: chatSession.id,
        role: 'ASSISTANT',
        content: finalContent
      })
    }

    // ── 7) Busca as mensagens geradas e retorna ao cliente ───────────
    const responses = await getMessages(threadId)

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

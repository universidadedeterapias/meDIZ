import { prisma } from './prisma'

export type ChatMessageRole = 'USER' | 'ASSISTANT'

interface SaveChatMessageParams {
  chatSessionId: string
  role: ChatMessageRole
  content: string
}

interface ThreadMessages {
  assistant: string[]
  user: string[]
}

async function getChatSessionIdByThread(threadId: string) {
  if (!threadId) {
    return null
  }

  const chatSession = await prisma.chatSession.findUnique({
    where: { threadId },
    select: { id: true }
  })

  return chatSession?.id ?? null
}

export async function saveChatMessage({
  chatSessionId,
  role,
  content
}: SaveChatMessageParams) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:29',message:'saveChatMessage entry',data:{chatSessionId,role,contentLength:content.length,contentPreview:content.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  const saved = await prisma.chatMessage.create({
    data: {
      chatSessionId,
      role,
      content
    }
  })
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:40',message:'saveChatMessage completed',data:{savedId:saved.id,role:saved.role,chatSessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
}

export async function getThreadMessages(threadId: string): Promise<ThreadMessages> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:43',message:'getThreadMessages entry',data:{threadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  const chatSessionId = await getChatSessionIdByThread(threadId)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:45',message:'ChatSessionId found',data:{chatSessionId:chatSessionId||'null',threadId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  if (!chatSessionId) {
    return { assistant: [], user: [] }
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      content: true
    }
  })
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:57',message:'Messages found in database',data:{totalMessages:messages.length,assistantMessages:messages.filter(m=>m.role==='ASSISTANT').length,userMessages:messages.filter(m=>m.role==='USER').length,roles:messages.map(m=>m.role)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  const result = messages.reduce<ThreadMessages>(
    (acc, message) => {
      if (message.role === 'ASSISTANT') {
        acc.assistant.push(message.content)
      } else if (message.role === 'USER') {
        acc.user.push(message.content)
      }
      return acc
    },
    { assistant: [], user: [] }
  )
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/87541063-b58b-4851-84d0-115904928ef7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chatMessages.ts:69',message:'getThreadMessages result',data:{assistantCount:result.assistant.length,userCount:result.user.length,firstAssistantPreview:result.assistant[0]?.substring(0,100)||'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  return result
}

export async function getThreadUserMessages(threadId: string) {
  
  const chatSessionId = await getChatSessionIdByThread(threadId)

  if (!chatSessionId) {
    return []
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatSessionId,
      role: 'USER'
    },
    orderBy: { createdAt: 'asc' },
    select: {
      content: true
    }
  })

  return messages.map(message => message.content)
}


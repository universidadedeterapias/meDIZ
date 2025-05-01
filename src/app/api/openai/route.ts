// app/api/openai/route.ts
import { auth } from '@/auth'
import {
  addMessageToThread,
  createThread,
  getMessages,
  runAssistant,
  waitForRunCompletion
} from '@/lib/assistant'
import {
  attachThreadToSession,
  getOrCreateChatSession
} from '@/lib/chatService'
import { NextResponse } from 'next/server'

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!
// console.log(ASSISTANT_ID)

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { message } = await req.json()
  const userId = session.user.id

  try {
    const chatSession = await getOrCreateChatSession(userId)

    let threadId = chatSession.threadId
    if (!threadId) {
      threadId = await createThread()
      await attachThreadToSession(chatSession.id, threadId)
    }

    await addMessageToThread(threadId, message)
    const runId = await runAssistant(threadId, ASSISTANT_ID)
    await waitForRunCompletion(threadId, runId)
    const responses = await getMessages(threadId)

    return NextResponse.json({ responses, threadId })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro ao processar assistant' },
      { status: 500 }
    )
  }
}

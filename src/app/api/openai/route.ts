// app/api/openai/route.ts
import { auth } from '@/auth'
import {
  addMessageToThread,
  createThread,
  getMessages,
  runAssistant,
  waitForRunCompletion
} from '@/lib/assistant'
import { createChatSessionWithThread } from '@/lib/chatService'
import { NextResponse } from 'next/server'

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const userId = session.user.id
  const { message } = await req.json()

  try {
    // 1) cria um thread novo
    const threadId = await createThread()

    // 2) cria a sessão vinculando o thread
    await createChatSessionWithThread(userId, threadId)

    // 3) adiciona mensagem e dispara o assistant
    await addMessageToThread(threadId, message)
    const runId = await runAssistant(threadId, ASSISTANT_ID)
    await waitForRunCompletion(threadId, runId)

    // 4) retorna o resultado
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

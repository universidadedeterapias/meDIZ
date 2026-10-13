// app/api/openai/messages/route.ts
import { auth } from '@/auth'
import { getMessages } from '@/lib/assistant'
import { getChatSessionForUser } from '@/lib/chatMessages'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('threadId')

  const session = await auth()
  if (!session?.user?.id || !threadId) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  // So o dono le a conversa — e conversa apagada nao abre mais.
  const chatSession = await getChatSessionForUser(threadId, session.user.id)
  if (!chatSession) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
  }

  const responses = await getMessages(threadId)
  return NextResponse.json({ responses })
}

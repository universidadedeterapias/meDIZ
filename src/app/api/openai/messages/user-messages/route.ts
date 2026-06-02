// app/api/openai/messages/user-messages/route.ts
import { auth } from '@/auth'
import { getUserMessages } from '@/lib/assistant'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const threadId = url.searchParams.get('threadId')

  // validação de sessão e parâmetro
  const session = await auth()
  if (!session?.user?.id || !threadId) {
    return NextResponse.json(
      { error: 'Usuário não autenticado ou threadId faltando' },
      { status: 400 }
    )
  }

  // busca as mensagens do usuário e retorna só a primeira
  const userMessages = await getUserMessages(threadId)
  const firstUserMessage = userMessages[0] ?? ''

  return NextResponse.json({ firstUserMessage })
}

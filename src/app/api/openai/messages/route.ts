// app/api/openai/messages/route.ts
import { auth } from '@/auth'
import { getMessages } from '@/lib/assistant'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const threadId = searchParams.get('threadId')

  const session = await auth()
  if (!session?.user?.id || !threadId) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  const responses = await getMessages(threadId)
  return NextResponse.json({ responses })
}

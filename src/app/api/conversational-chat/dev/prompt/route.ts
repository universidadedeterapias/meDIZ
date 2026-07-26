import { auth } from '@/auth'
import {
  getAgentPromptOverride,
  setAgentPromptOverride
} from '@/lib/conversational-chat/agent-prompt-config'
import {
  isAgentPromptTestModeEnabled,
  isConversationalAgentId
} from '@/lib/conversational-chat/config'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePromptSchema = z.object({
  agent: z.string(),
  prompt: z.string().trim().min(20).max(8000)
})

/**
 * Leitura/edicao do prompt de um agente conversacional, direto pela tela /chat —
 * so existe para permitir iterar o prompt manualmente em HML (`AGENT_PROMPT_TEST_MODE=true`).
 * O prompt e a fonte de verdade do agente: o workflow n8n consulta esta tabela em toda
 * mensagem (sem fallback hardcoded) — nao ha operacao de "restaurar padrao" aqui.
 */
export async function GET(request: Request) {
  if (!isAgentPromptTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const agentParam = searchParams.get('agent')

  if (!agentParam) {
    return NextResponse.json({ testMode: true })
  }

  if (!isConversationalAgentId(agentParam)) {
    return NextResponse.json({ error: 'agent inválido' }, { status: 400 })
  }

  const prompt = await getAgentPromptOverride(agentParam)

  return NextResponse.json({
    agent: agentParam,
    prompt: prompt ?? ''
  })
}

export async function POST(request: Request) {
  if (!isAgentPromptTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const parsedBody = updatePromptSchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', issues: parsedBody.error.flatten() },
      { status: 400 }
    )
  }

  if (!isConversationalAgentId(parsedBody.data.agent)) {
    return NextResponse.json({ error: 'agent inválido' }, { status: 400 })
  }

  await setAgentPromptOverride(
    parsedBody.data.agent,
    parsedBody.data.prompt,
    session.user.id
  )

  return NextResponse.json({ success: true, prompt: parsedBody.data.prompt })
}

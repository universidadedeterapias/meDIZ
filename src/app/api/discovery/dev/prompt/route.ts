import { auth } from '@/auth'
import { DISCOVERY_SYSTEM_PROMPT } from '@/lib/discovery'
import { isDiscoveryTestModeEnabled } from '@/lib/discovery-access'
import {
  getActiveDiscoverySystemPrompt,
  resetDiscoverySystemPromptOverride,
  setDiscoverySystemPromptOverride
} from '@/lib/discovery-prompt-config'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updatePromptSchema = z.object({
  prompt: z.string().trim().min(20).max(8000)
})

/**
 * Leitura/edicao do prompt do agente de descoberta, direto pela tela /descoberta —
 * so existe para permitir iterar o prompt manualmente em HML (`DISCOVERY_TEST_MODE=true`).
 */
export async function GET() {
  if (!isDiscoveryTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const prompt = await getActiveDiscoverySystemPrompt()

  return NextResponse.json({
    prompt,
    defaultPrompt: DISCOVERY_SYSTEM_PROMPT,
    isOverridden: prompt !== DISCOVERY_SYSTEM_PROMPT
  })
}

export async function POST(request: Request) {
  if (!isDiscoveryTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const parsedBody = updatePromptSchema.safeParse(await request.json().catch(() => null))
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Prompt inválido', issues: parsedBody.error.flatten() },
      { status: 400 }
    )
  }

  await setDiscoverySystemPromptOverride(parsedBody.data.prompt, session.user.id)

  return NextResponse.json({ success: true, prompt: parsedBody.data.prompt })
}

export async function DELETE() {
  if (!isDiscoveryTestModeEnabled()) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await resetDiscoverySystemPromptOverride()

  return NextResponse.json({ success: true, prompt: DISCOVERY_SYSTEM_PROMPT })
}

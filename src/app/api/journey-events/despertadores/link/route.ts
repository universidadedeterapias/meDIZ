import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { createAccessLink } from '@/lib/auth/access-link'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * O n8n vem pedir um link de acesso pra colocar no botao dos toques do
 * Sistema 1 ("Os Dois Despertadores"). So esse sistema precisa — Sistema 2 usa
 * URL fixa (https://mediz.app), sem token.
 *
 * Gera um link novo a cada chamada, igual `deliver-access.ts` faz no aviso
 * original: nao invalida os anteriores (o comprador pode ter mais de um link
 * vivo, o primeiro clicado e o que vale) e usa a validade padrao de 7 dias.
 */

const corpo = z.object({
  userId: z.string().min(1)
})

export async function POST(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const parsed = corpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'erro', mensagem: 'Informe userId.' },
      { status: 400 }
    )
  }

  try {
    const link = await createAccessLink(parsed.data.userId)
    return NextResponse.json({
      status: 'ok',
      url: link.url,
      expiresAt: link.expiresAt.toISOString()
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json(
      { status: 'erro', mensagem: 'Falha ao gerar o link.', detalhe: msg },
      { status: 500 }
    )
  }
}

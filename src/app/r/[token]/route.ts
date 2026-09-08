import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAccessLink } from '@/lib/auth/access-link'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * A porta da isca: registra o clique e leva a pessoa para dentro do app.
 *
 * Existe por dois motivos, e o segundo importa mais do que parece.
 *
 * 1. Taxa de clique. O plano chama de essencial, e com razao: sem separar
 *    "clicou" de "acessou", quem travou na porta e indistinguivel de quem nem
 *    abriu a mensagem — e as duas coisas pedem correcoes opostas.
 *
 * 2. O token de acesso deixa de viajar no WhatsApp. Ele e credencial: aparece na
 *    previa do link, no historico do navegador e no Referer. O que viaja aqui e
 *    um identificador curto que so serve para uma pessoa numa onda, e o link de
 *    acesso de verdade e criado no momento do clique — entao a validade de sete
 *    dias comeca a contar agora, e nao no dia em que a onda foi disparada.
 *
 * Falhar aqui e caro: a pessoa clicou, a isca funcionou, e travar na porta
 * queima o contato sem recuperar. Por isso qualquer erro de gravacao ainda
 * redireciona — perder a metrica e menos grave do que perder a pessoa.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const destinatario = await prisma.reactivationRecipient.findUnique({
    where: { trackToken: token },
    select: { id: true, userId: true, clicouEm: true }
  })

  if (!destinatario) {
    // Link velho ou adulterado. Manda para a porta da frente em vez de mostrar
    // erro: quem clicou tem intencao, e merece uma tela util.
    return NextResponse.redirect(new URL('/login', baseUrl()))
  }

  try {
    // So o primeiro clique conta. Reenviar a mensagem para si mesma nao infla a
    // taxa, e a pessoa que volta pelo mesmo link continua entrando.
    if (!destinatario.clicouEm) {
      await prisma.reactivationRecipient.update({
        where: { id: destinatario.id },
        data: { clicouEm: new Date() }
      })
    }
  } catch (e) {
    logger.error(
      'Falha ao registrar clique da reativação',
      e instanceof Error ? e : undefined,
      '[reativacao]'
    )
  }

  try {
    const link = await createAccessLink(destinatario.userId, {
      redirectTo: '/biblioteca'
    })
    return NextResponse.redirect(link.url)
  } catch (e) {
    logger.error(
      'Falha ao criar link de acesso da reativação',
      e instanceof Error ? e : undefined,
      '[reativacao]'
    )
    // Sem link magico, o login ainda resolve para quem tem senha.
    return NextResponse.redirect(new URL('/login?next=/biblioteca', baseUrl()))
  }
}

function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://mediz.app'
  )
}

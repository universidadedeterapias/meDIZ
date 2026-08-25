import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import {
  acceptedResetIdentifiers,
  hashResetToken
} from '@/lib/auth/password-reset-token'

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json()

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Confere token no banco (não logar o token por segurança).
    // Aceita os dois identifiers: o prefixado, que a rota de pedido grava hoje, e
    // o e-mail puro dos links emitidos antes do deploy — eles valem por 30 minutos
    // e nao podem quebrar na troca.
    const tokenHash = hashResetToken(token)
    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: { in: acceptedResetIdentifiers(email) },
        token: tokenHash,
        expires: { gt: new Date() }
      }
    })

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // Hash da nova senha (bcrypt)
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // O delete do token estava comentado porque falhava: "VerificationToken" nao
    // tem chave primaria e o banco publica DELETE, entao o Postgres recusava
    // (55000). Sem ele, o link de recuperacao seguia valido depois de usado — dava
    // para trocar a senha de novo com o mesmo link dentro da validade. A migration
    // 20260818120000 marcou a tabela com REPLICA IDENTITY FULL e o delete voltou.
    //
    // A sessao nao entra aqui de proposito: a estrategia e JWT, e a sessao vive no
    // cookie assinado, nao em linha de banco. `session.deleteMany` apagaria nada e
    // daria a impressao falsa de que trocar a senha derruba os outros dispositivos.
    // Revogar de verdade exige versionar o token — outro assunto.
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash }
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: verification.identifier, token: tokenHash }
      })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    // Não logar detalhes do erro para evitar vazamento de informações sensíveis
    if (process.env.NODE_ENV === 'development') {
      console.error('Reset password error:', error instanceof Error ? error.message : 'Unknown error')
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

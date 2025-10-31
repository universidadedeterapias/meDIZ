import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: Request) {
  try {
    const { email, token, newPassword } = await req.json()

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Confere token no banco (não logar o token por segurança)
    const tokenHash = hashToken(token)
    const verification = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
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

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash }
      })
      // prisma.verificationToken.deleteMany({
      //   where: { identifier: email, token: tokenHash }
      // }),
      // prisma.session.deleteMany({
      //   where: { user: { email } }
      // })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

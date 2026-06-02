/**
 * API apenas para ambiente de desenvolvimento/testes E2E.
 * Retorna o token de verificação do último signup para o email informado,
 * permitindo automatizar o fluxo de confirmação sem inserir o código manualmente.
 * Só responde se CYPRESS_TEST_HELPER_KEY estiver definido e o request enviar o mesmo valor.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const isTestHelperAllowed = () => {
  const key = process.env.CYPRESS_TEST_HELPER_KEY
  const isDev = process.env.NODE_ENV === 'development'
  return !!key && isDev
}

export async function GET(req: NextRequest) {
  if (!isTestHelperAllowed()) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const key = req.headers.get('x-cypress-test-key')
  const expected = process.env.CYPRESS_TEST_HELPER_KEY
  if (!key || key !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  const tokenRecord = await prisma.verificationToken.findFirst({
    where: { identifier: email },
    orderBy: { expires: 'desc' },
  })

  if (!tokenRecord || tokenRecord.expires < new Date()) {
    return NextResponse.json({ error: 'No valid token', token: null }, { status: 200 })
  }

  return NextResponse.json({ token: tokenRecord.token })
}

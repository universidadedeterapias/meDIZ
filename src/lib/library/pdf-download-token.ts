import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

export type PdfDownloadTokenPayload = {
  uid: string
  pid: string
  jti: string
  exp: number
}

const DEFAULT_TTL_SECONDS = 15 * 60

function getSecret(): string {
  const secret =
    process.env.PDF_DOWNLOAD_TOKEN_SECRET?.trim() ||
    process.env.LIBRARY_MEDIA_TOKEN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) {
    throw new Error('PDF_DOWNLOAD_TOKEN_SECRET ou NEXTAUTH_SECRET é obrigatório')
  }
  return secret
}

function sign(encoded: string): string {
  return createHmac('sha256', getSecret()).update(encoded).digest('base64url')
}

function encode(payload: PdfDownloadTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export async function createPdfDownloadToken(
  userId: string,
  productId: string
): Promise<{ token: string; expiresAt: Date }> {
  const jti = randomBytes(24).toString('hex')
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS
  const expiresAt = new Date(exp * 1000)

  await prisma.pdfDownloadToken.create({
    data: {
      userId,
      productId,
      jti,
      expiresAt
    }
  })

  const payload: PdfDownloadTokenPayload = { uid: userId, pid: productId, jti, exp }
  const encoded = encode(payload)
  return { token: `${encoded}.${sign(encoded)}`, expiresAt }
}

export function verifyPdfDownloadToken(
  token: string | null | undefined
): PdfDownloadTokenPayload | null {
  if (!token?.trim()) return null
  const [encoded, signature] = token.trim().split('.')
  if (!encoded || !signature) return null

  const expected = sign(encoded)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as PdfDownloadTokenPayload
    if (
      !payload?.uid ||
      !payload?.pid ||
      !payload?.jti ||
      typeof payload.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

export async function consumePdfDownloadToken(
  payload: PdfDownloadTokenPayload
): Promise<boolean> {
  const row = await prisma.pdfDownloadToken.findUnique({
    where: { jti: payload.jti },
    select: { userId: true, productId: true, expiresAt: true, usedAt: true }
  })

  if (
    !row ||
    row.userId !== payload.uid ||
    row.productId !== payload.pid ||
    row.usedAt ||
    row.expiresAt.getTime() < Date.now()
  ) {
    return false
  }

  await prisma.pdfDownloadToken.update({
    where: { jti: payload.jti },
    data: { usedAt: new Date() }
  })
  return true
}

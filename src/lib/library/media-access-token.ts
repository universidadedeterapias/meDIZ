import { createHmac, timingSafeEqual } from 'crypto'
import type { LibraryMediaKind } from '@/lib/library/media-origin'
import type { LibraryPermissoes } from '@/lib/library/permissions'

export type LibraryMediaPermission = keyof LibraryPermissoes

export type MediaAccessTokenPayload = {
  uid: string
  src: string
  exp: number
  pid?: string
  perm?: LibraryMediaPermission
  free?: boolean
  kind?: LibraryMediaKind
}

const DEFAULT_TTL_SECONDS = 2 * 60 * 60

function getMediaTokenSecret(): string {
  const secret =
    process.env.LIBRARY_MEDIA_TOKEN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim()
  if (!secret) {
    throw new Error('LIBRARY_MEDIA_TOKEN_SECRET ou NEXTAUTH_SECRET é obrigatório')
  }
  return secret
}

function getTokenTtlSeconds(): number {
  const raw = process.env.LIBRARY_MEDIA_TOKEN_TTL_SECONDS
  if (!raw) return DEFAULT_TTL_SECONDS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 60 ? parsed : DEFAULT_TTL_SECONDS
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', getMediaTokenSecret())
    .update(encodedPayload)
    .digest('base64url')
}

function encodePayload(payload: MediaAccessTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function createMediaAccessToken(
  input: Omit<MediaAccessTokenPayload, 'exp'> & { exp?: number }
): string {
  const payload: MediaAccessTokenPayload = {
    ...input,
    exp: input.exp ?? Math.floor(Date.now() / 1000) + getTokenTtlSeconds()
  }
  const encoded = encodePayload(payload)
  return `${encoded}.${signPayload(encoded)}`
}

export function verifyMediaAccessToken(
  token: string | null | undefined
): MediaAccessTokenPayload | null {
  if (!token?.trim()) return null

  const [encoded, signature] = token.trim().split('.')
  if (!encoded || !signature) return null

  const expected = signPayload(encoded)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as MediaAccessTokenPayload

    if (
      !payload?.uid ||
      !payload?.src ||
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

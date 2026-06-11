import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildR2PublicUrl,
  createR2PresignedPutUrl,
  generateR2ObjectKey,
  isR2Configured
} from '@/lib/r2'
import {
  isAllowedR2ContentType,
  R2_MAX_BYTES,
  resolveR2ContentType
} from '@/lib/catalog/r2-media-policy'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive().max(R2_MAX_BYTES)
})

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  if (!isR2Configured()) {
    const missing = [
      'R2_ACCOUNT_ENDPOINT',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
      'R2_PUBLIC_URL'
    ].filter((name) => !process.env[name]?.trim())
    return NextResponse.json(
      {
        error:
          'Storage R2 não configurado no servidor. Preencha no .env: ' +
          missing.join(', ')
      },
      { status: 503 }
    )
  }

  try {
    const body = schema.parse(await req.json())
    const contentType = resolveR2ContentType(body.fileName, body.contentType)

    if (!isAllowedR2ContentType(contentType)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido.' },
        { status: 400 }
      )
    }

    const key = generateR2ObjectKey(body.fileName)
    const uploadUrl = await createR2PresignedPutUrl(key, contentType)

    return NextResponse.json({
      uploadUrl,
      publicUrl: buildR2PublicUrl(key),
      key
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 })
    }
    console.error('[uploads/presign]', err)
    return NextResponse.json(
      { error: 'Falha ao gerar URL de upload.' },
      { status: 500 }
    )
  }
}

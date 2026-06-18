import { NextResponse } from 'next/server'
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2'
import {
  isAllowedR2ContentType,
  R2_PROXY_MAX_BYTES,
  resolveR2ContentType
} from '@/lib/catalog/r2-media-policy'
import { requireAdmin } from '@/lib/requireAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Upload via servidor — evita CORS do bucket (limite menor que presign direto). */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: 'Storage R2 não configurado no servidor.' },
      { status: 503 }
    )
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
    }
    if (file.size > R2_PROXY_MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            'Arquivo grande demais para upload via servidor. Configure CORS no bucket R2 e use upload direto (até 200 MB).'
        },
        { status: 413 }
      )
    }

    const contentType = resolveR2ContentType(file.name, file.type)
    if (!isAllowedR2ContentType(contentType)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, key } = await uploadBufferToR2(buffer, file.name, contentType)

    return NextResponse.json({
      publicUrl: url,
      key
    })
  } catch (err) {
    console.error('[uploads/proxy]', err)
    return NextResponse.json({ error: 'Falha no upload.' }, { status: 500 })
  }
}

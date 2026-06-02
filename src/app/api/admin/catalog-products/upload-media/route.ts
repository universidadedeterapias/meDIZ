import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import {
  saveCatalogMediaFile,
  type CatalogMediaKind
} from '@/lib/catalog/media-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS = new Set<CatalogMediaKind>(['cover', 'pdf', 'audio'])

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const kindParam = String(formData.get('kind') ?? 'audio')

    if (!KINDS.has(kindParam as CatalogMediaKind)) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido' }, { status: 400 })
    }

    const kind = kindParam as CatalogMediaKind

    if (
      !file ||
      typeof file === 'string' ||
      !(file instanceof File) ||
      file.size === 0
    ) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const uploadFile = file

    const arrayBuffer = await uploadFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await saveCatalogMediaFile(buffer, uploadFile.name, kind)

    return NextResponse.json({
      success: true,
      mediaRef: result.mediaRef,
      publicUrl: result.publicUrl,
      storage: result.storage
    })
  } catch (error) {
    console.error('[catalog-products/upload-media]', error)
    const message =
      error instanceof Error ? error.message : 'Falha no upload do arquivo'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/requireAuth'
import {
  cloudinaryErrorMessage,
  isAllowedImageFile,
  isCloudinaryConfigured,
  uploadImageStream
} from '@/lib/cloudinary-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.ok === false) return auth.response

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          'Upload indisponível: configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env'
      },
      { status: 503 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image')

    if (
      !file ||
      typeof file === 'string' ||
      !(file instanceof File) ||
      file.size === 0
    ) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
    }

    const uploadFile = file

    if (!isAllowedImageFile(uploadFile)) {
      return NextResponse.json(
        { error: 'Use JPEG, PNG ou WebP' },
        { status: 400 }
      )
    }

    if (uploadFile.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Máximo 5MB' }, { status: 400 })
    }

    const arrayBuffer = await uploadFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await uploadImageStream(buffer, {
      folder: 'mediz/catalog',
      publicId: `product-${Date.now()}`
    })

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id
    })
  } catch (error) {
    console.error('[catalog-products/upload]', error)
    return NextResponse.json(
      { error: cloudinaryErrorMessage(error) },
      { status: 500 }
    )
  }
}

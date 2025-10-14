import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { Readable } from 'stream'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificação de permissão
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' 
      }, { status: 400 })
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo 5MB' 
      }, { status: 400 })
    }

    // Converter arquivo para buffer e stream
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const stream = Readable.from(buffer)

    // Fazer upload para Cloudinary
    let uploadResult: UploadApiResponse
    try {
      uploadResult = await new Promise((resolve, reject) => {
        const uploader = cloudinary.uploader.upload_stream(
          {
            folder: 'popup_images',
            public_id: `popup-${Date.now()}`,
            overwrite: false,
            resource_type: 'image'
          },
          (err, result) => {
            if (err) return reject(err)
            resolve(result!)
          }
        )
        stream.pipe(uploader)
      })
    } catch (uploadError) {
      console.error('Erro no upload para Cloudinary:', uploadError)
      return NextResponse.json({ 
        error: 'Falha ao fazer upload da imagem' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl: uploadResult.secure_url,
      fileName: file.name,
      publicId: uploadResult.public_id
    })

  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// src/app/api/user/avatar/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'

// rodar no runtime Node
export const runtime = 'nodejs'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // 1) Extrai o arquivo via FormData
  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  // 2) Converte Blob → Buffer → Readable stream
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const stream = Readable.from(buffer)

  // 3) Faz upload para o Cloudinary via stream
  let uploadResult: UploadApiResponse
  try {
    uploadResult = await new Promise((resolve, reject) => {
      const uploader = cloudinary.uploader.upload_stream(
        {
          folder: 'user_avatars',
          public_id: session.user.id,
          overwrite: true
        },
        (err, result) => {
          if (err) return reject(err)
          resolve(result!)
        }
      )
      stream.pipe(uploader)
    })
  } catch (err) {
    console.error('Erro no upload:', err)
    return NextResponse.json(
      { error: 'Falha ao enviar avatar' },
      { status: 500 }
    )
  }

  // 4) Persiste a URL no banco
  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: uploadResult.secure_url }
    })
    return NextResponse.json({ image: updated.image })
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err)
    return NextResponse.json(
      { error: 'Não foi possível atualizar o usuário' },
      { status: 500 }
    )
  }
}

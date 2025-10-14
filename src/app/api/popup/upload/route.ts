import { auth } from '@/auth'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'popup')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Diretório já existe, continuar
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const fileName = `popup-${timestamp}.${extension}`
    const filePath = join(uploadDir, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar URL da imagem
    const imageUrl = `/uploads/popup/${fileName}`

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      fileName 
    })

  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

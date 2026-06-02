// src/app/api/popup/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Busca configuração ativa do popup
export async function GET() {
  try {
    const popup = await prisma.popupConfig.findFirst({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    if (!popup) {
      return NextResponse.json({ error: 'Nenhum popup ativo encontrado' }, { status: 404 })
    }

    return NextResponse.json(popup)
  } catch (error) {
    console.error('Erro ao buscar popup:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração do popup' }, { status: 500 })
  }
}

// POST - Cria/atualiza configuração do popup (apenas para admins)
export async function POST(req: Request) {
  const session = await auth()
  
  // Verificação básica de permissão (isso deve ser melhorado com um sistema de roles adequado)
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  try {
    const data = await req.json()
    const { id, title, content, imageUrl, subscribeLink, status } = data
    
    // Valida campos obrigatórios
    if (!title || !content || !subscribeLink) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: title, content, subscribeLink' 
      }, { status: 400 })
    }
    
    let popup
    
    if (id) {
      // Atualiza configuração existente
      popup = await prisma.popupConfig.update({
        where: { id },
        data: {
          title,
          content,
          imageUrl,
          subscribeLink,
          status: status as 'ACTIVE' | 'INACTIVE'
        }
      })
    } else {
      // Cria nova configuração
      popup = await prisma.popupConfig.create({
        data: {
          title,
          content,
          imageUrl,
          subscribeLink,
          status: status as 'ACTIVE' | 'INACTIVE' || 'ACTIVE'
        }
      })
    }
    
    return NextResponse.json(popup)
  } catch (error) {
    console.error('Erro ao salvar popup:', error)
    return NextResponse.json({ error: 'Erro ao salvar configuração do popup' }, { status: 500 })
  }
}

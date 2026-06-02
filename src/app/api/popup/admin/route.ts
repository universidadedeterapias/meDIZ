// src/app/api/popup/admin/route.ts
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Lista todas as configurações de popup (para admin)
export async function GET() {
  try {
    const session = await auth()
    
    // Verificação básica de permissão (isso deve ser melhorado com um sistema de roles adequado)
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
    
    console.log('[API Popup Admin] Buscando popups...')
    
    const popups = await prisma.popupConfig.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    console.log(`[API Popup Admin] Encontrados ${popups.length} popups`)
    
    return NextResponse.json(popups)
  } catch (error) {
    console.error('[API Popup Admin] Erro ao listar popups:', error)
    return NextResponse.json({ 
      error: 'Erro ao listar popups',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

// DELETE - Exclui uma configuração de popup
export async function DELETE(req: Request) {
  const session = await auth()
  
  // Verificação básica de permissão
  if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })
  }
  
  try {
    await prisma.popupConfig.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir popup:', error)
    return NextResponse.json({ error: 'Erro ao excluir popup' }, { status: 500 })
  }
}

// src/app/api/admin/requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Por enquanto, retornar dados mockados até as tabelas serem criadas
    const mockRequests = [
      {
        id: 'test-1',
        userId: 'test-user-1',
        userEmail: 'teste@exemplo.com',
        userName: 'Usuário Teste',
        reason: 'Solicitação de acesso administrativo para gerenciar usuários',
        status: 'PENDING',
        requestedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        reviewerEmail: null,
        notes: null
      },
      {
        id: 'test-2',
        userId: 'test-user-2',
        userEmail: 'admin@empresa.com',
        userName: 'Admin Empresa',
        reason: 'Preciso de acesso para configurar pop-ups e análises',
        status: 'APPROVED',
        requestedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
        reviewedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 min atrás
        reviewedBy: 'marianna-admin',
        reviewerEmail: 'marianna.yaskara@mediz.com',
        notes: 'Aprovado para teste do sistema'
      }
    ]

    // Aplicar filtros
    let filteredRequests = mockRequests
    if (status !== 'all') {
      filteredRequests = mockRequests.filter(req => req.status === status)
    }

    // Paginação
    const paginatedRequests = filteredRequests.slice(skip, skip + limit)

    return NextResponse.json({
      success: true,
      requests: paginatedRequests,
      pagination: {
        page,
        limit,
        total: filteredRequests.length,
        pages: Math.ceil(filteredRequests.length / limit)
      }
    })

  } catch (error) {
    console.error('[Admin Requests API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const { requestId, action, notes } = await req.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: 'ID da solicitação e ação são obrigatórios' }, { status: 400 })
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Por enquanto, simular aprovação/rejeição
    return NextResponse.json({
      success: true,
      message: action === 'APPROVED' 
        ? 'Solicitação aprovada (modo teste)'
        : 'Solicitação rejeitada (modo teste)',
      request: {
        id: requestId,
        status: action,
        reviewedAt: new Date().toISOString(),
        notes: notes || null
      }
    })

  } catch (error) {
    console.error('[Admin Requests API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}
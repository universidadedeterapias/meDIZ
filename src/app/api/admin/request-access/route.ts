// src/app/api/admin/request-access/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logAuditAction, AuditResources } from '@/lib/auditLogger'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { reason } = await req.json()

    // Verificar se já é admin
    if (session.user.email?.includes('@mediz.com')) {
      return NextResponse.json({ 
        error: 'Você já possui acesso administrativo' 
      }, { status: 400 })
    }

    // Verificar se já existe uma solicitação pendente usando SQL direto
    const existingRequestQuery = `
      SELECT id FROM admin_requests 
      WHERE user_id = $1 AND status = 'PENDING'
    `
    
    const existingRequestResult = await prisma.$queryRawUnsafe(existingRequestQuery, session.user.id)
    const existingRequest = (existingRequestResult as Record<string, unknown>[])[0]

    if (existingRequest) {
      return NextResponse.json({ 
        error: 'Você já possui uma solicitação pendente de acesso administrativo' 
      }, { status: 400 })
    }

    // Criar nova solicitação usando SQL direto
    const requestId = `admin-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await prisma.$executeRawUnsafe(
      `INSERT INTO admin_requests (id, user_id, user_email, user_name, reason, status, requested_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6)`,
      requestId,
      session.user.id,
      session.user.email || '',
      session.user.name || 'Usuário',
      reason || 'Solicitação de acesso administrativo',
      new Date()
    )

    // Log da ação
    await logAuditAction({
      adminId: session.user.id,
      adminEmail: session.user.email || '',
      action: 'ADMIN_ACCESS_REQUESTED',
      resource: AuditResources.ADMIN_REQUEST,
      resourceId: requestId,
      details: {
        requestId: requestId,
        reason: reason || 'Solicitação de acesso administrativo'
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitação de acesso administrativo enviada com sucesso',
      requestId: requestId
    })

  } catch (error) {
    console.error('[Admin Request API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Buscar solicitações do usuário usando SQL direto
    const requestsQuery = `
      SELECT id, reason, status, requested_at, reviewed_at, notes
      FROM admin_requests
      WHERE user_id = $1
      ORDER BY requested_at DESC
    `
    
    const requestsResult = await prisma.$queryRawUnsafe(requestsQuery, session.user.id)
    const requests = requestsResult as Record<string, unknown>[]

    return NextResponse.json({
      success: true,
      requests: requests.map(req => ({
        id: req.id,
        reason: req.reason,
        status: req.status,
        requestedAt: req.requested_at,
        reviewedAt: req.reviewed_at,
        notes: req.notes
      }))
    })

  } catch (error) {
    console.error('[Admin Request API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

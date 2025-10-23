// src/app/api/admin/audit-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logDataExport } from '@/lib/auditLogger'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    // Buscar admin no banco
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 })
    }

    // Buscar todos os logs
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' }
    })

    // Gerar CSV
    const csvHeader = [
      'ID',
      'Timestamp',
      'Admin ID',
      'Admin Nome',
      'Admin Email',
      'Ação',
      'Recurso',
      'ID do Recurso',
      'Detalhes',
      'IP Address',
      'User Agent'
    ].join(',')

    const csvRows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.adminId,
      '', // Admin name não disponível
      log.adminEmail,
      log.action,
      log.resource,
      log.resourceId || '',
      log.details ? `"${log.details.replace(/"/g, '""')}"` : '',
      log.ipAddress || '',
      log.userAgent ? `"${log.userAgent.replace(/"/g, '""')}"` : ''
    ].join(','))

    const csvContent = [csvHeader, ...csvRows].join('\n')

    // Registrar exportação no audit log
    await logDataExport(admin.id, session.user.email, 'CSV', logs.length, req)

    // Retornar arquivo CSV
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('[Audit Logs Export API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

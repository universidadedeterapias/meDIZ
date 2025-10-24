// src/app/api/admin/dashboard-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  console.log('[Dashboard API] Iniciando requisição GET')
  try {
    const session = await auth()
    console.log('[Dashboard API] Sessão obtida:', session ? 'Sim' : 'Não')
    console.log('[Dashboard API] Email do usuário:', session?.user?.email)
    
    // Verificar se é admin
    if (!session?.user?.email || !session.user.email.includes('@mediz.com')) {
      console.log('[Dashboard API] Usuário não autorizado - não é admin')
      console.log('[Dashboard API] Email recebido:', session?.user?.email)
      console.log('[Dashboard API] Contém @mediz.com:', session?.user?.email?.includes('@mediz.com'))
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
    
    console.log('[Dashboard API] Usuário autorizado, prosseguindo...')

    // Inicializar com valores padrão
    const stats = {
      totalUsers: 0,
      premiumUsers: 0,
      freeUsers: 0,
      activeUsers: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalChatSessions: 0,
      pendingAdminRequests: 0,
      conversionRate: 0,
      recentAuditLogs: []
    }

    try {
      // Buscar apenas dados básicos de usuários (tabela que sabemos que existe)
      const totalUsersResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`
      stats.totalUsers = parseInt((totalUsersResult as Record<string, unknown>[])[0].count as string)

      // Buscar usuários ativos (últimos 7 dias)
      const activeUsersResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '7 days'`
      stats.activeUsers = parseInt((activeUsersResult as Record<string, unknown>[])[0].count as string)

      // Buscar total de sessões de chat
      const totalChatSessionsResult = await prisma.chatSession.count()
      stats.totalChatSessions = totalChatSessionsResult

      // Buscar usuários premium (com assinaturas ativas)
      try {
        const premiumUsersResult = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT u.id) as count 
          FROM "User" u
          INNER JOIN "Subscription" s ON u.id = s."userId"
          WHERE s.status IN ('active', 'ACTIVE', 'cancel_at_period_end')
          AND s."currentPeriodEnd" >= NOW()
        `
        stats.premiumUsers = parseInt((premiumUsersResult as Record<string, unknown>[])[0].count as string)
        
        // Calcular usuários gratuitos
        stats.freeUsers = stats.totalUsers - stats.premiumUsers
        
        // Calcular taxa de conversão
        stats.conversionRate = stats.totalUsers > 0 ? 
          Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0
        
        console.log(`[Dashboard API] Usuários premium: ${stats.premiumUsers}, Gratuitos: ${stats.freeUsers}, Conversão: ${stats.conversionRate}%`)
      } catch (error) {
        console.log('[Dashboard API] Erro ao calcular usuários premium, usando valores padrão:', error)
        stats.premiumUsers = 0
        stats.freeUsers = stats.totalUsers
        stats.conversionRate = 0
      }

      console.log(`[Dashboard API] Dados reais: ${stats.totalUsers} usuários, ${stats.activeUsers} ativos, ${stats.totalChatSessions} sessões de chat`)

      // Tentar buscar dados de admin_requests (se existir)
      try {
        const pendingRequestsResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM admin_requests 
          WHERE status = 'PENDING'
        `
        stats.pendingAdminRequests = parseInt((pendingRequestsResult as Record<string, unknown>[])[0].count as string)
        console.log(`[Dashboard API] Solicitações admin pendentes: ${stats.pendingAdminRequests}`)
      } catch {
        console.log('[Dashboard API] Tabela admin_requests não encontrada')
        stats.pendingAdminRequests = 0
      }

      // Tentar buscar logs de auditoria (se existir)
      try {
        const recentAuditLogsResult = await prisma.$queryRaw`
          SELECT action, admin_email, timestamp
          FROM audit_logs 
          ORDER BY timestamp DESC 
          LIMIT 5
        `
        stats.recentAuditLogs = (recentAuditLogsResult as Record<string, unknown>[]).map(log => ({
          action: log.action as string,
          adminEmail: log.admin_email as string,
          timestamp: log.timestamp as string
        }))
        console.log(`[Dashboard API] Logs de auditoria: ${stats.recentAuditLogs.length} encontrados`)
      } catch {
        console.log('[Dashboard API] Tabela audit_logs não encontrada')
        stats.recentAuditLogs = []
      }

    } catch (error) {
      console.error('[Dashboard API] Erro ao buscar estatísticas:', error)
    }

    console.log('[Dashboard API] Retornando dados finais:', stats)
    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('[Dashboard Stats API] Erro:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

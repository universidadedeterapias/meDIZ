// src/lib/auditLogger.ts
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export interface AuditLogData {
  adminId: string
  adminEmail: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra uma ação de auditoria usando SQL direto
 */
export async function logAuditAction(data: AuditLogData): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, admin_email, action, resource, resource_id, details, ip_address, user_agent)
      VALUES (${id}, ${data.adminId}, ${data.adminEmail}, ${data.action}, ${data.resource}, ${data.resourceId || null}, ${data.details ? JSON.stringify(data.details) : null}, ${data.ipAddress || null}, ${data.userAgent || null})
    `
    
    // console.log('[AUDIT LOG] Registrado:', {
    //   action: data.action,
    //   resource: data.resource,
    //   adminEmail: data.adminEmail
    // })
  } catch (error) {
    console.error('[AuditLogger] Erro ao registrar log:', error)
    // Não falhar a operação principal por causa do log
  }
}

/**
 * Extrai informações da requisição para auditoria
 */
export function extractRequestInfo(req: NextRequest) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  }
}

/**
 * Logs pré-definidos para ações comuns
 */
export const AuditActions = {
  // Autenticação
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  
  // Usuários
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_VIEW: 'USER_VIEW',
  
  // Assinaturas
  SUBSCRIPTION_CREATE: 'SUBSCRIPTION_CREATE',
  SUBSCRIPTION_UPDATE: 'SUBSCRIPTION_UPDATE',
  SUBSCRIPTION_DELETE: 'SUBSCRIPTION_DELETE',
  SUBSCRIPTION_VIEW: 'SUBSCRIPTION_VIEW',
  
  // Popups
  POPUP_CREATE: 'POPUP_CREATE',
  POPUP_UPDATE: 'POPUP_UPDATE',
  POPUP_DELETE: 'POPUP_DELETE',
  POPUP_VIEW: 'POPUP_VIEW',
  
  // Configurações
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  
  // Exportação
  DATA_EXPORT: 'DATA_EXPORT',
  
  // 2FA
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  DEVICE_TRUSTED: 'DEVICE_TRUSTED',
  DEVICE_REVOKED: 'DEVICE_REVOKED',
  
  // Admin requests
  ADMIN_ACCESS_REQUESTED: 'ADMIN_ACCESS_REQUESTED',
  ADMIN_ACCESS_APPROVED: 'ADMIN_ACCESS_APPROVED',
  ADMIN_ACCESS_REJECTED: 'ADMIN_ACCESS_REJECTED',
  
  // Security alerts
  SECURITY_ALERT_SENT: 'SECURITY_ALERT_SENT',
  SUSPICIOUS_LOGIN: 'SUSPICIOUS_LOGIN',
  MULTIPLE_ATTEMPTS: 'MULTIPLE_ATTEMPTS',
  
  // Password management
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED'
} as const

export const AuditResources = {
  USER: 'user',
  SUBSCRIPTION: 'subscription',
  POPUP: 'popup',
  SETTINGS: 'settings',
  AUTH: 'auth',
  DEVICE: 'device',
  ADMIN_REQUEST: 'admin_request'
} as const

/**
 * Helper para log de login
 */
export async function logLogin(adminId: string, adminEmail: string, req: NextRequest, success: boolean = true): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action: success ? AuditActions.LOGIN : AuditActions.LOGIN_FAILED,
    resource: AuditResources.AUTH,
    details: {
      success,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de logout
 */
export async function logLogout(adminId: string, adminEmail: string, req: NextRequest): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action: AuditActions.LOGOUT,
    resource: AuditResources.AUTH,
    details: {
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de ações em usuários
 */
export async function logUserAction(
  adminId: string, 
  adminEmail: string, 
  action: string, 
  userId: string, 
  details: Record<string, unknown>,
  req: NextRequest
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action,
    resource: AuditResources.USER,
    resourceId: userId,
    details,
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de ações em assinaturas
 */
export async function logSubscriptionAction(
  adminId: string, 
  adminEmail: string, 
  action: string, 
  subscriptionId: string, 
  details: Record<string, unknown>,
  req: NextRequest
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action,
    resource: AuditResources.SUBSCRIPTION,
    resourceId: subscriptionId,
    details,
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de exportação de dados
 */
export async function logDataExport(
  adminId: string, 
  adminEmail: string, 
  format: string, 
  recordCount: number,
  req: NextRequest
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action: AuditActions.DATA_EXPORT,
    resource: AuditResources.USER,
    details: {
      format,
      recordCount,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de alertas de segurança
 */
export async function logSecurityAlert(
  adminId: string, 
  adminEmail: string, 
  alertType: string, 
  details: Record<string, unknown>,
  req: NextRequest
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(req)
  
  await logAuditAction({
    adminId,
    adminEmail,
    action: AuditActions.SECURITY_ALERT_SENT,
    resource: AuditResources.AUTH,
    details: {
      alertType,
      ...details,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de login suspeito
 */
export async function logSuspiciousLogin(
  adminId: string, 
  adminEmail: string, 
  ipAddress: string, 
  userAgent: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await logAuditAction({
    adminId,
    adminEmail,
    action: AuditActions.SUSPICIOUS_LOGIN,
    resource: AuditResources.AUTH,
    details: {
      ipAddress,
      userAgent,
      ...details,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent
  })
}

/**
 * Helper para log de múltiplas tentativas
 */
export async function logMultipleAttempts(
  adminId: string, 
  adminEmail: string, 
  attempts: number, 
  ipAddress: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await logAuditAction({
    adminId,
    adminEmail,
    action: AuditActions.MULTIPLE_ATTEMPTS,
    resource: AuditResources.AUTH,
    details: {
      attempts,
      ipAddress,
      ...details,
      timestamp: new Date().toISOString()
    },
    ipAddress,
    userAgent: 'unknown'
  })
}

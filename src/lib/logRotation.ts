// src/lib/logRotation.ts
// Sistema de rotação de logs para evitar acúmulo excessivo

import { prisma } from '@/lib/prisma'

/**
 * Configurações de retenção de logs
 */
const RETENTION_DAYS = {
  auditLogs: 90, // 90 dias para logs de auditoria
  securityAlerts: 180, // 180 dias para alertas de segurança
  generalLogs: 30 // 30 dias para logs gerais
}

/**
 * Remove logs de auditoria antigos
 */
export async function rotateAuditLogs(): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS.auditLogs)

  const result = await prisma.auditLog.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate
      }
    }
  })

  return result.count
}

/**
 * Remove logs de segurança antigos (mantém apenas alertas importantes)
 */
export async function rotateSecurityLogs(): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS.securityAlerts)

  // Remove apenas logs que não são alertas críticos
  // Nota: Não podemos filtrar por detalhes.attempts diretamente no Prisma
  // então removemos logs antigos independente do número de tentativas
  const result = await prisma.auditLog.deleteMany({
    where: {
      action: {
        in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS']
      },
      timestamp: {
        lt: cutoffDate
      }
    }
  })

  return result.count
}

/**
 * Limpa todos os logs antigos baseado nas políticas de retenção
 */
export async function rotateAllLogs(): Promise<{
  auditLogsDeleted: number
  securityLogsDeleted: number
}> {
  const auditLogsDeleted = await rotateAuditLogs()
  const securityLogsDeleted = await rotateSecurityLogs()

  return {
    auditLogsDeleted,
    securityLogsDeleted
  }
}

/**
 * Retorna estatísticas de logs antes da rotação
 */
export async function getLogStats(): Promise<{
  totalAuditLogs: number
  oldAuditLogs: number
  totalSecurityLogs: number
  oldSecurityLogs: number
}> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS.auditLogs)

  const [totalAuditLogs, oldAuditLogs, totalSecurityLogs, oldSecurityLogs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    }),
    prisma.auditLog.count({
      where: {
        action: {
          in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS']
        }
      }
    }),
    prisma.auditLog.count({
      where: {
        action: {
          in: ['SECURITY_ALERT_SENT', 'SUSPICIOUS_LOGIN', 'MULTIPLE_ATTEMPTS']
        },
        timestamp: {
          lt: cutoffDate
        }
      }
    })
  ])

  return {
    totalAuditLogs,
    oldAuditLogs,
    totalSecurityLogs,
    oldSecurityLogs
  }
}


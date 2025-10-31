/**
 * 🚨 Serviço de Alertas para Detecção de Injeção
 * 
 * Dispara alertas automáticos quando SQL Injection ou Command Injection são detectados
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppText, isWhatsAppConfigured, simulateWhatsAppSend } from '@/lib/whatsappService'
import { logSecurityAlert } from '@/lib/auditLogger'
import type { InjectionDetectionResult } from './injection-detector'

interface InjectionAlertData {
  detection: InjectionDetectionResult
  request: {
    endpoint: string
    method: string
    ipAddress: string
    userAgent?: string
    userId?: string
  }
}

/**
 * Formata mensagem de alerta para WhatsApp
 */
function formatAlertMessage(data: InjectionAlertData): string {
  const { detection, request } = data
  
  const typeLabel = detection.type === 'SQL_INJECTION' ? 'SQL Injection' : 'Command Injection'
  const severityEmoji = {
    low: '⚠️',
    medium: '🟠',
    high: '🔴',
    critical: '🚨'
  }[detection.severity] || '⚠️'
  
  return `🚨 ALERTA DE SEGURANÇA - meDIZ

Tipo: ${typeLabel} Detectado
Severidade: ${detection.severity.toUpperCase()} ${severityEmoji}

Detalhes:
• Endpoint: ${request.method} ${request.endpoint}
• IP: ${request.ipAddress}
• Padrão: ${detection.pattern || 'N/A'}
• Localização: ${detection.location || 'N/A'}
${detection.details.field ? `• Campo: ${detection.details.field}` : ''}
• Bloqueado: Sim

Data: ${new Date().toLocaleString('pt-BR')}
${request.userAgent ? `User-Agent: ${request.userAgent.substring(0, 50)}...` : ''}`
}

/**
 * Extrai informações da requisição
 */
function extractRequestInfo(req: NextRequest, endpoint: string, userId?: string) {
  return {
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               req.headers.get('cf-connecting-ip') ||
               'unknown',
    userAgent: req.headers.get('user-agent') || undefined,
    endpoint,
    method: req.method,
    userId
  }
}

/**
 * Registra tentativa de injeção no banco de dados
 */
async function recordInjectionAttempt(data: InjectionAlertData): Promise<string> {
  const { detection, request } = data
  
  const attempt = await prisma.injectionAttempt.create({
    data: {
      type: detection.type!,
      severity: detection.severity,
      pattern: detection.pattern || 'unknown',
      location: detection.location || 'unknown',
      field: detection.details.field,
      value: detection.details.value?.substring(0, 500), // Limitar tamanho
      endpoint: request.endpoint,
      method: request.method,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      userId: request.userId,
      blocked: true,
      alertSent: false // Será atualizado após envio
    }
  })
  
  return attempt.id
}

/**
 * Envia alerta para todos os admins via WhatsApp
 */
async function sendAlertsToAdmins(message: string): Promise<boolean> {
  try {
    // Buscar todos os admins
    const admins = await prisma.user.findMany({
      where: {
        email: {
          contains: '@mediz.com'
        },
        whatsapp: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        whatsapp: true,
        name: true
      }
    })
    
    if (admins.length === 0) {
      console.warn('[InjectionAlert] Nenhum admin encontrado com WhatsApp cadastrado')
      return false
    }
    
    let successCount = 0
    
    // Enviar para cada admin
    for (const admin of admins) {
      if (!admin.whatsapp) continue
      
      try {
        let sent = false
        
        if (isWhatsAppConfigured()) {
          // Usar sendWhatsAppText diretamente porque a mensagem já está formatada
          sent = await sendWhatsAppText(admin.whatsapp, message)
        } else {
          // Modo desenvolvimento - simular
          simulateWhatsAppSend(admin.whatsapp, message)
          sent = true
        }
        
        if (sent) {
          successCount++
          console.log(`[InjectionAlert] Alerta enviado para ${admin.email}`)
        }
      } catch (error) {
        console.error(`[InjectionAlert] Erro ao enviar para ${admin.email}:`, error)
      }
    }
    
    return successCount > 0
  } catch (error) {
    console.error('[InjectionAlert] Erro ao buscar admins:', error)
    return false
  }
}

/**
 * Registra no audit log
 */
async function logToAudit(data: InjectionAlertData, attemptId: string, alertSent: boolean): Promise<void> {
  try {
    // Buscar admin padrão (sistema) ou usar ID genérico
    const systemAdmin = await prisma.user.findFirst({
      where: {
        email: {
          contains: '@mediz.com'
        }
      },
      select: {
        id: true,
        email: true
      }
    })
    
    if (systemAdmin) {
      // Criar uma requisição simulada para o log
      const headers = new Headers()
      headers.set('x-forwarded-for', data.request.ipAddress)
      if (data.request.userAgent) {
        headers.set('user-agent', data.request.userAgent)
      }
      
      const mockReq = new NextRequest('http://localhost', {
        headers
      })
      
      await logSecurityAlert(
        systemAdmin.id,
        systemAdmin.email,
        `INJECTION_${data.detection.type}_DETECTED`,
        {
          attemptId,
          type: data.detection.type,
          severity: data.detection.severity,
          endpoint: data.request.endpoint,
          method: data.request.method,
          ipAddress: data.request.ipAddress,
          pattern: data.detection.pattern,
          alertSent
        },
        mockReq as NextRequest
      )
    }
  } catch (error) {
    console.error('[InjectionAlert] Erro ao registrar no audit log:', error)
    // Não falhar a operação principal
  }
}

/**
 * Processa detecção de injeção e dispara alertas
 */
export async function processInjectionDetection(
  detection: InjectionDetectionResult,
  req: NextRequest,
  endpoint: string,
  userId?: string
): Promise<{ attemptId: string; alertSent: boolean }> {
  if (!detection.detected) {
    throw new Error('Detecção inválida: detected deve ser true')
  }
  
  const requestInfo = extractRequestInfo(req, endpoint, userId)
  
  const alertData: InjectionAlertData = {
    detection,
    request: requestInfo
  }
  
  // 1. Registrar no banco de dados
  const attemptId = await recordInjectionAttempt(alertData)
  
  // 2. Formatar mensagem de alerta
  const alertMessage = formatAlertMessage(alertData)
  
  // 3. Enviar alertas para admins
  const alertSent = await sendAlertsToAdmins(alertMessage)
  
  // 4. Atualizar registro com status do alerta
  await prisma.injectionAttempt.update({
    where: { id: attemptId },
    data: { alertSent }
  })
  
  // 5. Registrar no audit log
  await logToAudit(alertData, attemptId, alertSent)
  
  console.log(`[InjectionAlert] Tentativa de ${detection.type} detectada e processada:`, {
    attemptId,
    endpoint,
    ipAddress: requestInfo.ipAddress,
    alertSent
  })
  
  return { attemptId, alertSent }
}


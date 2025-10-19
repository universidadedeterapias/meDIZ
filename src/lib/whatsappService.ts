// src/lib/whatsappService.ts


/**
 * Converte número para formato E164 (Brasil)
 */
export function toBrazilE164(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Se já tem código do país, retorna
  if (cleanPhone.startsWith('55')) {
    return `+${cleanPhone}`
  }
  
  // Se tem 11 dígitos (celular), adiciona código do país
  if (cleanPhone.length === 11) {
    return `+55${cleanPhone}`
  }
  
  // Se tem 10 dígitos (fixo), adiciona código do país
  if (cleanPhone.length === 10) {
    return `+55${cleanPhone}`
  }
  
  // Se tem 9 dígitos, assume que falta o DDD
  if (cleanPhone.length === 9) {
    return `+5511${cleanPhone}` // Assume SP como padrão
  }
  
  // Retorna como está se não conseguir formatar
  return `+55${cleanPhone}`
}

/**
 * Envia mensagem de texto via WhatsApp usando Z-API
 */
export async function sendWhatsAppText(phone: string, message: string): Promise<boolean> {
  try {
    const formattedPhone = toBrazilE164(phone)
    
    // Z-API endpoint
    const zapiSendText = `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`
    
    const payload = {
      phone: formattedPhone,
      message: message
    }

    const response = await fetch(zapiSendText, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': process.env.ZAPI_CLIENT_TOKEN || ''
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log(`[WhatsApp] Mensagem enviada para ${formattedPhone}`)
      return true
    } else {
      const errorText = await response.text().catch(() => '<no-body>')
      console.error(`[WhatsApp] Erro ao enviar para ${formattedPhone}:`, {
        status: response.status,
        body: errorText
      })
      return false
    }
  } catch (error) {
    console.error(`[WhatsApp] Erro de conexão para ${phone}:`, error)
    return false
  }
}

/**
 * Envia mensagem com link via WhatsApp usando Z-API
 */
export async function sendWhatsAppLink(phone: string, title: string, url: string, description: string): Promise<boolean> {
  try {
    const formattedPhone = toBrazilE164(phone)
    
    // Z-API endpoints
    const zapiSendMessageLink = `${process.env.ZAPI_BASE_URL}/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-message-link`

    // 1) Tenta enviar usando send-message-link (botão/link)
    let sentLink = false
    try {
      const linkPayload = {
        phone: formattedPhone,
        title: title,
        url: url,
        description: description
      }

      const linkResponse = await fetch(zapiSendMessageLink, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': process.env.ZAPI_CLIENT_TOKEN || ''
        },
        body: JSON.stringify(linkPayload)
      })

      if (linkResponse.ok) {
        sentLink = true
        console.log(`[WhatsApp] Link enviado para ${formattedPhone}`)
      } else {
        const errorText = await linkResponse.text().catch(() => '<no-body>')
        console.error(`[WhatsApp] Erro send-message-link para ${formattedPhone}:`, {
          status: linkResponse.status,
          body: errorText
        })
      }
    } catch (error) {
      console.error(`[WhatsApp] Erro send-message-link para ${formattedPhone}:`, error)
    }

    // 2) Fallback: se send-message-link não funcionou, envia como texto
    if (!sentLink) {
      const textMessage = `${description}\n\n${title}: ${url}`
      return await sendWhatsAppText(phone, textMessage)
    }

    return true
  } catch (error) {
    console.error(`[WhatsApp] Erro geral para ${phone}:`, error)
    return false
  }
}

/**
 * Envia código de verificação 2FA
 */
export async function send2FACode(phone: string, code: string, adminName: string): Promise<boolean> {
  const message = `🔐 Código de verificação meDIZ Admin: ${code}

Olá ${adminName}!

Este código expira em 5 minutos.

Se você não solicitou este código, ignore esta mensagem.`

  return await sendWhatsAppText(phone, message)
}

/**
 * Envia link de confirmação de cadastro
 */
export async function sendSignupConfirmation(phone: string, userName: string, confirmationUrl: string): Promise<boolean> {
  const message = `Olá ${userName}! 👋

Bem-vindo(a) ao meDIZ! 

Para confirmar seu cadastro e ativar sua conta, clique no link abaixo:

${confirmationUrl}

⚠️ IMPORTANTE: Para que o link funcione corretamente, você precisa adicionar este número aos seus contatos do WhatsApp antes de clicar no link.

Após adicionar o contato, clique no link acima para confirmar seu cadastro.`

  return await sendWhatsAppText(phone, message)
}

/**
 * Envia alerta de segurança para admins
 */
export async function sendSecurityAlert(phone: string, alertType: string, details: string): Promise<boolean> {
  const message = `🚨 ALERTA DE SEGURANÇA - meDIZ

Tipo: ${alertType}

Detalhes: ${details}

Timestamp: ${new Date().toLocaleString('pt-BR')}

Se você não reconhece esta atividade, entre em contato com a equipe técnica imediatamente.`

  return await sendWhatsAppText(phone, message)
}

/**
 * Envia notificação de login suspeito
 */
export async function sendSuspiciousLoginAlert(phone: string, adminName: string, ipAddress: string, userAgent: string): Promise<boolean> {
  const message = `⚠️ LOGIN SUSPEITO DETECTADO - meDIZ

Olá ${adminName},

Detectamos um login em sua conta admin com as seguintes informações:

📍 IP: ${ipAddress}
🖥️ Dispositivo: ${userAgent}
⏰ Horário: ${new Date().toLocaleString('pt-BR')}

Se foi você, pode ignorar esta mensagem.
Se não foi você, altere sua senha imediatamente!`

  return await sendWhatsAppText(phone, message)
}

/**
 * Envia notificação de múltiplas tentativas de login
 */
export async function sendMultipleLoginAttemptsAlert(phone: string, adminName: string, attempts: number, ipAddress: string): Promise<boolean> {
  const message = `🔒 MÚLTIPLAS TENTATIVAS DE LOGIN - meDIZ

Olá ${adminName},

Detectamos ${attempts} tentativas de login falhadas em sua conta admin:

📍 IP: ${ipAddress}
⏰ Horário: ${new Date().toLocaleString('pt-BR')}

Por segurança, recomendamos:
1. Verificar se sua senha está segura
2. Alterar a senha se necessário
3. Verificar se alguém tem acesso não autorizado

Se você não fez essas tentativas, entre em contato com a equipe técnica.`

  return await sendWhatsAppText(phone, message)
}

/**
 * Envia notificação de exportação de dados
 */
export async function sendDataExportAlert(phone: string, adminName: string, exportType: string, recordCount: number): Promise<boolean> {
  const message = `📊 EXPORTAÇÃO DE DADOS - meDIZ

Olá ${adminName},

Uma exportação de dados foi realizada:

📋 Tipo: ${exportType}
📈 Registros: ${recordCount}
⏰ Horário: ${new Date().toLocaleString('pt-BR')}

Se você não solicitou esta exportação, entre em contato com a equipe técnica imediatamente.`

  return await sendWhatsAppText(phone, message)
}

/**
 * Verifica se o WhatsApp está configurado
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.ZAPI_BASE_URL &&
    process.env.ZAPI_INSTANCE_ID &&
    process.env.ZAPI_TOKEN
  )
}

/**
 * Simula envio de WhatsApp para testes
 */
export function simulateWhatsAppSend(phone: string, message: string): boolean {
  console.log(`🧪 [SIMULAÇÃO WHATSAPP] Para: ${phone}`)
  console.log(`🧪 [SIMULAÇÃO WHATSAPP] Mensagem: ${message}`)
  console.log(`🧪 [SIMULAÇÃO WHATSAPP] ✅ Enviado com sucesso`)
  return true
}
import { NextResponse } from 'next/server'

const WEBHOOK_URL = 'https://mediz-n8n.gjhi7d.easypanel.host/webhook/5351ba84-1219-40f7-98f7-25f33fccd7f7'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, phone, message } = body

    // Validação básica
    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    // Envia para o webhook do n8n
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone,
        message,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!webhookResponse.ok) {
      console.error('Erro ao enviar para webhook:', webhookResponse.status)
      return NextResponse.json(
        { error: 'Erro ao enviar sugestão. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Sugestão enviada com sucesso!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao processar sugestão:', error)
    return NextResponse.json(
      { error: 'Erro ao processar sugestão. Tente novamente.' },
      { status: 500 }
    )
  }
}


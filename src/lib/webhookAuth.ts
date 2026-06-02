import { NextRequest, NextResponse } from 'next/server'

export function validateWebhookBearer(request: NextRequest): NextResponse | null {
  const secret = process.env.WEBHOOK_SECRET_TOKEN
  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 503 }
    )
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

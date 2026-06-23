import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateWebhookBearer } from '@/lib/webhookAuth'
import { lookupWebhookCustomer } from '@/lib/webhooks/lookup-customer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const emailQuerySchema = z.string().trim().email()

export async function GET(request: NextRequest) {
  const authError = validateWebhookBearer(request)
  if (authError) return authError

  const emailParam = request.nextUrl.searchParams.get('email')
  if (!emailParam) {
    return NextResponse.json(
      { error: 'Missing query param: email' },
      { status: 400 }
    )
  }

  const parsed = emailQuerySchema.safeParse(emailParam)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    const result = await lookupWebhookCustomer(parsed.data)
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[webhooks/customer]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

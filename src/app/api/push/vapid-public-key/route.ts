import { NextResponse } from 'next/server'
import { getVAPIDPublicKey } from '@/lib/webPush'

/**
 * Endpoint público para obter a chave pública VAPID
 * Necessária para o frontend registrar subscriptions
 */
export async function GET() {
  const publicKey = getVAPIDPublicKey()

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID keys não configuradas' },
      { status: 500 }
    )
  }

  return NextResponse.json({ publicKey })
}







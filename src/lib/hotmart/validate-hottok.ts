import { NextRequest, NextResponse } from 'next/server'

/**
 * Valida o token Hotmart (hottok) quando HOTMART_HOTTOK está configurado.
 * Header: X-Hotmart-Hottok ou query ?hottok=
 */
export function validateHotmartHottok(request: NextRequest): NextResponse | null {
  const expected = process.env.HOTMART_HOTTOK?.trim()
  if (!expected) return null

  const header = request.headers.get('x-hotmart-hottok')?.trim()
  const query = request.nextUrl.searchParams.get('hottok')?.trim()
  const received = header || query

  if (!received || received !== expected) {
    return NextResponse.json(
      { error: 'Invalid Hotmart hottok', received: true },
      { status: 401 }
    )
  }

  return null
}

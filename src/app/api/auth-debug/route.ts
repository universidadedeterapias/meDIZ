// src/app/api/auth-debug/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Usar o auth() importado de @/auth que já tem a configuração
    const session = await auth()
    
    // Para debug, vamos verificar os cookies também
    const cookiesList = await cookies()  // Adicionando await aqui
    const sessionTokenCookie = cookiesList.get('next-auth.session-token')
    
    return NextResponse.json({
      isAuthenticated: !!session,
      user: session?.user || null,
      isAdmin: session?.user?.email?.includes('@mediz.com') || false,
      cookies: {
        sessionToken: sessionTokenCookie ? 'Presente' : 'Ausente',
      },
      timestamp: new Date().toISOString(),
      serverInfo: {
        environment: process.env.NODE_ENV,
        nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'Configurado' : 'Não configurado'
      }
    })
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao verificar autenticação', 
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
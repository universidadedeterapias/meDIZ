// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // Aplicar apenas a rotas do admin - otimização de performance
  // EXCLUIR /admin-login para evitar loop infinito
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin-login') {
    console.log(`[Middleware] Acessando: ${request.nextUrl.pathname}`)
    
    try {
      // Verificar se NEXTAUTH_SECRET está configurado
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('[Middleware] NEXTAUTH_SECRET não está configurado')
        return NextResponse.redirect(new URL('/auth/error?error=Configuration', request.url))
      }

      // Usar getToken que é compatível com middleware
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        cookieName: process.env.NODE_ENV === 'production' 
          ? '__Secure-authjs.session-token' 
          : 'authjs.session-token'
      })
      
      // Registrar informações para diagnóstico
      if (token?.email) {
        console.log(`[Middleware] Usuário autenticado: ${token.email}`)
        console.log(`[Middleware] Admin: ${token.email.includes('@mediz.com') ? 'Sim' : 'Não'}`)
        console.log(`[Middleware] Token expira em: ${token.exp ? new Date(token.exp * 1000).toLocaleString() : 'Desconhecido'}`)
      } else {
        console.log('[Middleware] Usuário não autenticado')
      }
      
      // Se não houver token, redirecionar para login admin
      if (!token?.email) {
        console.log('[Middleware] Redirecionando para login admin - sem token')
        const loginUrl = new URL('/admin-login', request.url)
        return NextResponse.redirect(loginUrl)
      }
      
      // Verificar se o token não expirou
      if (token.exp && token.exp < Date.now() / 1000) {
        console.log('[Middleware] Token expirado, redirecionando para login')
        const loginUrl = new URL('/admin-login', request.url)
        loginUrl.searchParams.set('error', 'session_expired')
        return NextResponse.redirect(loginUrl)
      }
      
      // Verificar se é um admin (email contém @mediz.com)
      const userEmail = token.email
      const isAdmin = userEmail.includes('@mediz.com')
      
      if (!isAdmin) {
        console.log('[Middleware] Acesso negado: não é admin')
        // Não é admin - redirecionar para login admin com mensagem
        const loginUrl = new URL('/admin-login', request.url)
        loginUrl.searchParams.set('error', 'not_admin')
        return NextResponse.redirect(loginUrl)
      }
      
      console.log('[Middleware] Admin autenticado - acesso permitido')
      return NextResponse.next()
    } catch (error) {
      console.error('[Middleware] Erro:', error)
      // Em caso de erro, redirecionar para página de erro
      return NextResponse.redirect(new URL('/auth/error?error=Configuration', request.url))
    }
  }
  
  return NextResponse.next()
}

// Configurar quais caminhos o middleware deve executar
export const config = {
  matcher: ['/admin/:path*', '/admin-login', '/api/admin/:path*']
}
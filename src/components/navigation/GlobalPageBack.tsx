'use client'

import { usePathname } from 'next/navigation'
import { PageBackButton } from './PageBackButton'

/** Rotas que já têm botão voltar no cabeçalho da página */
const PAGES_WITH_HEADER_BACK = [
  '/audioterapia',
  '/biblioteca',
  '/cursos',
  '/symptoms-dashboard',
  '/myAccount',
  '/account/payments-history'
] as const

/** Rotas “home” ou fluxo onde voltar não faz sentido */
const HIDE_EXACT = new Set([
  '/',
  '/chat',
  '/prof',
  '/simulador',
  '/admin-login',
  '/form',
  '/success',
  '/confirm-signup'
])

function shouldShowGlobalBack(pathname: string): boolean {
  if (HIDE_EXACT.has(pathname)) return false
  if (pathname.startsWith('/simulador/')) return false
  if (pathname.startsWith('/prof/')) return false
  if (pathname.startsWith('/admin')) return false
  if (
    PAGES_WITH_HEADER_BACK.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return false
  }
  return true
}

function getFallback(pathname: string): string {
  if (pathname === '/login' || pathname === '/signup' || pathname === '/install') {
    return '/'
  }
  if (pathname.startsWith('/reset') || pathname.startsWith('/auth')) {
    return '/login'
  }
  if (pathname === '/trocar-senha' || pathname === '/verify-whatsapp') {
    return '/login'
  }
  return '/chat'
}

/**
 * Botão flutuante para páginas sem cabeçalho próprio (trocar senha, upsell, etc.)
 */
export function GlobalPageBack() {
  const pathname = usePathname() ?? ''

  if (!shouldShowGlobalBack(pathname)) return null

  return (
    <div className="pointer-events-none fixed left-2 top-2 z-[60] sm:left-4 sm:top-4">
      <div className="pointer-events-auto rounded-xl bg-background/98 p-0.5 shadow-lg ring-1 ring-indigo-200/80 backdrop-blur-md dark:ring-indigo-800">
        <PageBackButton fallbackHref={getFallback(pathname)} />
      </div>
    </div>
  )
}

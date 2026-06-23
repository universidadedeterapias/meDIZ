'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import AdminSidebar from './AdminSidebar'
import { AdminMobileNav } from './AdminMobileNav'
import { PageBackButton } from '@/components/navigation/PageBackButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { User, Bell, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminClientLayoutProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
}

export default function AdminClientLayout({
  children,
  userName = 'Admin',
  userEmail = ''
}: AdminClientLayoutProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  function getPageTitle(path: string) {
    const parts = path.split('/')
    const lastPart = parts[parts.length - 1] || 'admin'
    
    const titles: Record<string, string> = {
      'admin': 'Dashboard',
      'popup': 'Gerenciamento de Pop-ups',
      'users': 'Gerenciamento de Usuários',
      'settings': 'Configurações',
      'ab-testing': 'Testes A/B',
      'analytics': 'Análises',
      'support': 'Suporte',
      'clientes-pendentes': 'Biblioteca (WhatsApp)',
      'biblioteca': 'Biblioteca',
      'catalogo': 'Catálogo',
      'produtos': 'Produtos do catálogo'
    }
    
    return titles[lastPart] || 'Admin'
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      // Limpar todos os caches ANTES do logout
      const { clearAllCaches } = await import('@/lib/logout-utils')
      clearAllCaches()
      
      // Registrar logout no audit log
      await fetch('/api/admin/audit-logs/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    } catch (error) {
      console.error('Erro ao registrar logout:', error)
    }
    
    // Fazer logout com callback que força refresh
    await signOut({ 
      callbackUrl: '/admin-login',
      redirect: true 
    })
    
    // Forçar reload completo após logout (fallback caso redirect não funcione)
    setTimeout(() => {
      window.location.href = '/admin-login'
    }, 500)
  }
  
  // Não renderizar até estar montado no cliente
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-muted/40">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando painel...</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex min-h-screen min-w-0 bg-muted/40">
      <div className="hidden shrink-0 md:block">
        <AdminSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2.5 sm:px-4 sm:py-3 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <AdminMobileNav />
            <PageBackButton
              fallbackHref={pathname === '/admin' ? '/chat' : '/admin'}
              variant="outline"
              className="hidden sm:inline-flex"
            />
            <h2 className="truncate text-sm font-medium text-foreground sm:text-base">
              {getPageTitle(pathname)}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-4">
            <ThemeToggle variant="icon" />
            <button
              type="button"
              className="hidden text-muted-foreground hover:text-foreground sm:block"
              aria-label="Notificações"
            >
              <Bell className="h-5 w-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 p-2">
                  <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">{userName}</div>
                    <div className="text-xs text-gray-500">{userEmail}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/admin/security'}>
                  <Settings className="mr-2 h-4 w-4" />
                  Segurança
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {loggingOut ? 'Saindo...' : 'Sair'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="page-content mx-auto max-w-7xl !px-0">{children}</div>

          <footer className="mt-8 border-t py-4 text-center text-xs text-muted-foreground sm:mt-12 sm:text-sm">
            &copy; {new Date().getFullYear()} meDIZ! - Painel Administrativo
          </footer>
        </main>
      </div>
    </div>
  )
}

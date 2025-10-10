'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import AdminSidebar from './AdminSidebar'
import { User, Bell } from 'lucide-react'

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
      'support': 'Suporte'
    }
    
    return titles[lastPart] || 'Admin'
  }
  
  // Não renderizar até estar montado no cliente
  if (!mounted) {
    return (
      <div className="flex min-h-screen bg-gray-50">
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar responsiva */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b py-3 px-6 flex items-center justify-between">
          <h2 className="font-medium text-gray-800">{getPageTitle(pathname)}</h2>
          
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-800">
              <Bell className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                <User className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-gray-500">{userEmail}</div>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
          
          <footer className="mt-12 py-4 border-t text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} meDIZ! - Painel Administrativo
          </footer>
        </main>
      </div>
    </div>
  )
}

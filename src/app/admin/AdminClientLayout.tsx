'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, LifeBuoy, Settings, User, Users, LayoutDashboard, MessageSquareDashed } from 'lucide-react'

interface AdminClientLayoutProps {
  children: React.ReactNode
  userName: string
  userEmail: string
}

export default function AdminClientLayout({
  children,
  userName,
  userEmail
}: AdminClientLayoutProps) {
  const pathname = usePathname()
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white">
        <div className="h-16 border-b flex items-center px-6">
          <h1 className="text-xl font-bold text-indigo-600">meDIZ Admin</h1>
        </div>
        
        <div className="py-4">
          <nav className="space-y-1 px-2">
            <MenuItem
              href="/admin"
              icon={<LayoutDashboard className="mr-3 h-5 w-5" />}
              text="Dashboard"
              active={pathname === '/admin'}
            />
            <MenuItem
              href="/admin/popup"
              icon={<MessageSquareDashed className="mr-3 h-5 w-5" />}
              text="Pop-ups"
              active={pathname === '/admin/popup'}
            />
            <MenuItem
              href="/admin/users"
              icon={<Users className="mr-3 h-5 w-5" />}
              text="Usuários"
              active={pathname === '/admin/users'}
            />
            <MenuItem
              href="/admin/settings"
              icon={<Settings className="mr-3 h-5 w-5" />}
              text="Configurações"
              active={pathname === '/admin/settings'}
            />
            <div className="pt-4 mt-4 border-t">
              <MenuItem
                href="/"
                icon={<Home className="mr-3 h-5 w-5" />}
                text="Voltar ao Site"
                active={false}
              />
              <MenuItem
                href="/admin/support"
                icon={<LifeBuoy className="mr-3 h-5 w-5" />}
                text="Suporte"
                active={pathname === '/admin/support'}
              />
            </div>
          </nav>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
          <h2 className="text-lg font-medium">
            {getPageTitle(pathname)}
          </h2>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
              <User className="h-5 w-5" />
            </div>
            <div className="text-sm hidden md:block">
              <div className="font-medium">{userName}</div>
              <div className="text-xs text-gray-500">{userEmail}</div>
            </div>
          </div>
        </header>
        
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}

function MenuItem({ 
  href, 
  icon, 
  text, 
  active 
}: { 
  href: string
  icon: React.ReactNode
  text: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
        active
          ? 'bg-indigo-100 text-indigo-600'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {text}
    </Link>
  )
}

function getPageTitle(pathname: string): string {
  const parts = pathname.split('/')
  const lastPart = parts[parts.length - 1]
  
  switch (lastPart) {
    case 'admin':
      return 'Dashboard'
    case 'popup':
      return 'Gerenciamento de Pop-ups'
    case 'users':
      return 'Gerenciamento de Usuários'
    case 'settings':
      return 'Configurações'
    case 'ab-testing':
      return 'Testes A/B'
    case 'analytics':
      return 'Análises'
    case 'support':
      return 'Suporte'
    default:
      return 'Admin'
  }
}
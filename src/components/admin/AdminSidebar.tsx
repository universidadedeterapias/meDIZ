'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  MessageSquareDashed, 
  Users, 
  Settings, 
  Home,
  LineChart,
  LifeBuoy,
  FileSpreadsheet,
  TrendingUp,
  Shield,
  FileText,
  Bell
} from 'lucide-react'

export default function AdminSidebar() {
  const pathname = usePathname()
  const [pendingRequests, setPendingRequests] = useState(0)
  
  useEffect(() => {
    // Carregar contador de solicitações pendentes
    fetch('/api/admin/dashboard-stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPendingRequests(data.stats.pendingAdminRequests)
        }
      })
      .catch(() => {}) // Ignorar erros
  }, [])
  
  const mainLinks = [
    { 
      href: '/admin', 
      icon: LayoutDashboard, 
      label: 'Dashboard',
      active: pathname === '/admin'
    },
    { 
      href: '/admin/popup', 
      icon: MessageSquareDashed, 
      label: 'Pop-ups',
      active: pathname === '/admin/popup'
    },
    { 
      href: '/admin/users', 
      icon: Users, 
      label: 'Usuários',
      active: pathname === '/admin/users'
    },
    { 
      href: '/admin/settings', 
      icon: Settings, 
      label: 'Configurações',
      active: pathname === '/admin/settings'
    },
    { 
      href: '/admin/analytics', 
      icon: LineChart, 
      label: 'Análises',
      active: pathname === '/admin/analytics'
    },
    { 
      href: '/admin/export-sintomas', 
      icon: FileSpreadsheet, 
      label: 'Exportar Sintomas',
      active: pathname === '/admin/export-sintomas'
    },
    { 
      href: '/admin/sintomas-metrics', 
      icon: TrendingUp, 
      label: 'Métricas Sintomas',
      active: pathname === '/admin/sintomas-metrics'
    },
    { 
      href: '/admin/security', 
      icon: Shield, 
      label: 'Segurança',
      active: pathname === '/admin/security'
    },
    { 
      href: '/admin/audit-logs', 
      icon: FileText, 
      label: 'Logs de Auditoria',
      active: pathname === '/admin/audit-logs'
    },
    { 
      href: '/admin/security-alerts', 
      icon: Bell, 
      label: 'Alertas de Segurança',
      active: pathname === '/admin/security-alerts'
    },
    { 
      href: '/admin/admin-requests', 
      icon: Shield, 
      label: 'Solicitações Admin',
      active: pathname === '/admin/admin-requests',
      badge: pendingRequests > 0 ? pendingRequests : undefined
    }
  ]
  
  const bottomLinks = [
    { 
      href: '/', 
      icon: Home, 
      label: 'Voltar ao Site',
      active: false
    },
    { 
      href: '/admin/support', 
      icon: LifeBuoy, 
      label: 'Suporte',
      active: pathname === '/admin/support'
    }
  ]
  
  const renderLink = (link: typeof mainLinks[0]) => {
    const Icon = link.icon
    
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center px-3 py-2 rounded-md transition-colors ${
          link.active
            ? 'bg-indigo-50 text-indigo-600'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
        <span className="flex-1">{link.label}</span>
        {link.badge && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {link.badge}
          </span>
        )}
      </Link>
    )
  }
  
  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      <div className="p-6 border-b">
        <Link href="/admin" className="text-xl font-bold text-indigo-600">
          meDIZ Admin
        </Link>
      </div>
      
      <div className="flex-1 p-4">
        <nav className="space-y-1">
          {mainLinks.map(renderLink)}
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <nav className="space-y-1">
          {bottomLinks.map(renderLink)}
        </nav>
      </div>
    </div>
  )
}

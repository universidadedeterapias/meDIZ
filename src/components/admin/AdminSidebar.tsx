'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  MessageSquareDashed, 
  Users, 
  Settings, 
  Home,
  LineChart,
  TestTube2,
  LifeBuoy,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react'

export default function AdminSidebar() {
  const pathname = usePathname()
  
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
      href: '/admin/ab-testing', 
      icon: TestTube2, 
      label: 'Testes A/B',
      active: pathname === '/admin/ab-testing'
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
        <span>{link.label}</span>
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

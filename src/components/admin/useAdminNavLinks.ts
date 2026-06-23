'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
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
  Bell,
  BellRing,
  Library,
  Package
} from 'lucide-react'

export type AdminNavLink = {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  badge?: number
}

export function useAdminNavLinks() {
  const pathname = usePathname()
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    fetch('/api/admin/dashboard-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPendingRequests(data.stats.pendingAdminRequests)
        }
      })
      .catch(() => {})
  }, [])

  const mainLinks = useMemo<AdminNavLink[]>(
    () => [
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
        href: '/admin/catalogo/produtos',
        icon: Package,
        label: 'Produtos (Biblioteca)',
        active: pathname.startsWith('/admin/catalogo')
      },
      {
        href: '/admin/biblioteca/clientes-pendentes',
        icon: Library,
        label: 'Biblioteca (WhatsApp)',
        active: pathname.startsWith('/admin/biblioteca')
      },
      {
        href: '/admin/reminders',
        icon: BellRing,
        label: 'Lembretes',
        active:
          pathname === '/admin/reminders' ||
          pathname.startsWith('/admin/reminders')
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
        href: '/admin/metrics',
        icon: TrendingUp,
        label: 'Métricas',
        active: pathname === '/admin/metrics'
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
    ],
    [pathname, pendingRequests]
  )

  const bottomLinks = useMemo<AdminNavLink[]>(
    () => [
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
    ],
    [pathname]
  )

  return { mainLinks, bottomLinks }
}
